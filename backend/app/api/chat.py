from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import List

from ..db import get_db
from ..models import SystemSetting, LifeMode, StudyRecord, FinancialRecord, DailyMetric, BrainMemory
from ..schemas import ChatRequest, ChatResponse, BrainMemoryResponse
from ..services.ai_agent import generate_ai_reply

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def post_chat_message(payload: ChatRequest, db: Session = Depends(get_db)):
    # 1. 获取系统配置（获取 API Key 及当前所处模式）
    settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    api_key = settings.deepseek_api_key if settings else None
    mode_name = settings.current_mode if settings else "cozy"
    
    # 2. 获取当前模式的展示名称和 AI 风格设定
    mode = db.query(LifeMode).filter(LifeMode.name == mode_name).first()
    mode_display = mode.display_name if mode else "日常自律模式"
    mode_prompt = mode.ai_system_prompt if mode else ""
    
    # 3. 收集今天的指标统计数据
    today = date.today()
    study_min = db.query(func.sum(StudyRecord.duration_minutes)).filter(
        StudyRecord.date == today,
        StudyRecord.category != "exercise"
    ).scalar() or 0
    
    exercise_min = db.query(func.sum(StudyRecord.duration_minutes)).filter(
        StudyRecord.date == today,
        StudyRecord.category == "exercise"
    ).scalar() or 0
    
    expense_sum = db.query(func.sum(FinancialRecord.amount)).filter(
        FinancialRecord.date == today,
        FinancialRecord.type == "expense"
    ).scalar() or 0.0
    
    income_sum = db.query(func.sum(FinancialRecord.amount)).filter(
        FinancialRecord.date == today,
        FinancialRecord.type == "income"
    ).scalar() or 0.0
    
    metric = db.query(DailyMetric).filter(DailyMetric.date == today).first()
    weight = metric.weight if metric else None
    bmi = metric.bmi if metric else None
    luogu_solved = metric.luogu_solved_count if metric else 0
    
    today_stats = {
        "study_minutes": study_min,
        "exercise_minutes": exercise_min,
        "luogu_solved": luogu_solved,
        "expense": expense_sum,
        "income": income_sum,
        "weight": weight,
        "bmi": bmi
    }
    
    # 4. 调用 AI Agent 生成回复，自动进行记忆提取与召回
    reply, memories_used, hologram_state = generate_ai_reply(
        db=db,
        api_key=api_key,
        user_message=payload.message,
        current_mode_name=mode_display,
        current_mode_prompt=mode_prompt,
        today_stats=today_stats
    )
    
    # 5. 如果在大模型对话中提到切换模式，并且是结合方案，我们支持在后端直接切模式
    # 这里做简单的规则匹配，如果回复里带有特殊的确认标记，我们执行模式切换
    # 在实际前段交互中，AI 对话会返回文本建议，用户点击弹窗确认，后端这里留一个被动切换的彩蛋即可
    
    return ChatResponse(
        reply=reply,
        hologram_state=hologram_state,
        memories_used=memories_used
    )

@router.get("/chat/memories", response_model=List[BrainMemoryResponse])
def get_memories(db: Session = Depends(get_db)):
    """获取 MOSS-Lite 记住的主人所有心事和梦想"""
    return db.query(BrainMemory).order_by(BrainMemory.importance_score.desc(), BrainMemory.id.desc()).all()

@router.delete("/chat/memories/{memory_id}")
def delete_memory(memory_id: int, db: Session = Depends(get_db)):
    """删除某条被遗忘或记录错误的记忆碎片"""
    memory = db.query(BrainMemory).filter(BrainMemory.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="记忆不存在")
    db.delete(memory)
    db.commit()
    return {"detail": "记忆碎片已从脑海中抹除"}
