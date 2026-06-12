from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import List

from ..db import get_db, SessionLocal
from ..models import SystemSetting, LifeMode, StudyRecord, FinancialRecord, DailyMetric, BrainMemory, ChatMessage
from ..schemas import ChatRequest, ChatResponse, BrainMemoryResponse, ChatMessageResponse
from ..services.ai_agent import generate_ai_reply, extract_and_save_memories

router = APIRouter()

def run_memory_extraction_task(api_key: str, api_base_url: str, model_name: str, message: str):
    """在后台线程独立启动数据库会话来提取记忆，防止 Session 被提早关闭"""
    db = SessionLocal()
    try:
        extract_and_save_memories(db, api_key, api_base_url, model_name, message)
    finally:
        db.close()

@router.post("/chat", response_model=ChatResponse)
def post_chat_message(payload: ChatRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. 获取系统配置（获取 API Key 及当前所处模式）
    settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    api_key = settings.deepseek_api_key if settings else None
    api_base = settings.deepseek_api_base if settings else "https://api.deepseek.com/v1"
    api_model = settings.deepseek_model if settings else "deepseek-chat"
    mode_name = settings.current_mode if settings else "cozy"
    
    # 2. 保存用户当前发送的消息到数据库
    user_msg = ChatMessage(
        sender="user",
        text=payload.message,
        timestamp=datetime.now()
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)
    
    # 3. 从数据库中拉取历史聊天记录 (作为 AI 上下文)
    chat_history = db.query(ChatMessage).order_by(ChatMessage.id.asc()).all()
    # 传给 AI 的时候，不需要把刚刚插入的 user_msg 包含在 history 里，排除掉最后一条
    history_for_ai = chat_history[:-1]

    # 获取当前模式的展示名称和 AI 风格设定
    mode = db.query(LifeMode).filter(LifeMode.name == mode_name).first()
    mode_display = mode.display_name if mode else "日常自律模式"
    mode_prompt = mode.ai_system_prompt if mode else ""
    
    # 4. 收集今天的指标统计数据
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
    
    # 5. 调用 AI Agent 生成回复，自动进行记忆检索与召回
    reply, memories_used, hologram_state = generate_ai_reply(
        db=db,
        api_key=api_key,
        api_base_url=api_base,
        model_name=api_model,
        user_message=payload.message,
        chat_history=history_for_ai,
        current_mode_name=mode_display,
        current_mode_prompt=mode_prompt,
        today_stats=today_stats
    )
    
    # 6. 保存 AI 的回复消息到数据库
    ai_msg = ChatMessage(
        sender="link",
        text=reply,
        timestamp=datetime.now(),
        state=hologram_state
    )
    db.add(ai_msg)
    db.commit()

    # 7. 在后台任务中异步进行记忆提取与保存 (不阻塞主对话响应)
    if api_key:
        background_tasks.add_task(
            run_memory_extraction_task,
            api_key,
            api_base,
            api_model,
            payload.message
        )
    
    return ChatResponse(
        reply=reply,
        hologram_state=hologram_state,
        memories_used=memories_used
    )

@router.get("/chat/history", response_model=List[ChatMessageResponse])
def get_chat_history(db: Session = Depends(get_db)):
    """获取所有历史聊天记录"""
    return db.query(ChatMessage).order_by(ChatMessage.id.asc()).all()

@router.delete("/chat/history")
def clear_chat_history(db: Session = Depends(get_db)):
    """清空所有历史聊天记录"""
    db.query(ChatMessage).delete()
    db.commit()
    return {"detail": "聊天记录已清空"}

@router.get("/chat/memories", response_model=List[BrainMemoryResponse])
def get_memories(db: Session = Depends(get_db)):
    """获取 Link 记住的主人所有心事和梦想"""
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
