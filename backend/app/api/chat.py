from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
from typing import List

from ..db import get_db, SessionLocal
from ..models import SystemSetting, LifeMode, StudyRecord, FinancialRecord, DailyMetric, BrainMemory, ChatMessage
from ..schemas import ChatRequest, ChatResponse, BrainMemoryResponse, ChatMessageResponse, BrainMemoryUpdate, MessageUpdateRequest, MessageUpdateResponse
from ..services.ai_agent import generate_ai_reply, extract_and_save_memories
from .records import get_time_range_stats

router = APIRouter()

def run_memory_extraction_task(api_key: str, api_base_url: str, model_name: str, message: str):
    """在后台线程独立启动数据库会话来提取记忆，防止 Session 被提早关闭"""
    db = SessionLocal()
    try:
        extract_and_save_memories(db, api_key, api_base_url, model_name, message)
    finally:
        db.close()

def compile_ai_context_stats(db: Session) -> dict:
    today = date.today()
    start_week = today - timedelta(days=today.weekday())
    
    # 1. 多周期时间汇总数据
    time_range_stats = get_time_range_stats(db)
    
    # 2. 今日及本周各分类专注时间明细
    today_records = db.query(
        StudyRecord.category,
        func.sum(StudyRecord.duration_minutes).label("total_minutes")
    ).filter(StudyRecord.date == today).group_by(StudyRecord.category).all()
    today_study_by_category = {row[0]: int(row[1]) for row in today_records}
    
    weekly_records = db.query(
        StudyRecord.category,
        func.sum(StudyRecord.duration_minutes).label("total_minutes")
    ).filter(StudyRecord.date >= start_week).group_by(StudyRecord.category).all()
    weekly_study_by_category = {row[0]: int(row[1]) for row in weekly_records}
    
    # 3. 今日自律指标
    expense_sum = db.query(func.sum(FinancialRecord.amount)).filter(
        FinancialRecord.date == today, FinancialRecord.type == "expense"
    ).scalar() or 0.0
    income_sum = db.query(func.sum(FinancialRecord.amount)).filter(
        FinancialRecord.date == today, FinancialRecord.type == "income"
    ).scalar() or 0.0
    
    metric = db.query(DailyMetric).filter(DailyMetric.date == today).first()
    weight = metric.weight if metric else None
    bmi = metric.bmi if metric else None
    luogu_solved = metric.luogu_solved_count if metric else 0
    
    # 4. 本周汇总
    weekly_expense = db.query(func.sum(FinancialRecord.amount)).filter(
        FinancialRecord.date >= start_week, FinancialRecord.type == "expense"
    ).scalar() or 0.0
    weekly_income = db.query(func.sum(FinancialRecord.amount)).filter(
        FinancialRecord.date >= start_week, FinancialRecord.type == "income"
    ).scalar() or 0.0
    weekly_luogu = db.query(func.sum(DailyMetric.luogu_solved_count)).filter(
        DailyMetric.date >= start_week
    ).scalar() or 0
    
    return {
        "today_study_by_category": today_study_by_category,
        "today_luogu": luogu_solved,
        "today_expense": expense_sum,
        "today_income": income_sum,
        "today_weight": weight,
        "today_bmi": bmi,
        
        "weekly_study_by_category": weekly_study_by_category,
        "weekly_luogu": int(weekly_luogu),
        "weekly_expense": round(float(weekly_expense), 2),
        "weekly_income": round(float(weekly_income), 2),
        
        "monthly_study": time_range_stats["monthly"]["study_minutes"],
        "monthly_exercise": time_range_stats["monthly"]["exercise_minutes"],
        "monthly_luogu": time_range_stats["monthly"]["luogu_solved"],
        
        "yearly_study": time_range_stats["yearly"]["study_minutes"],
        "yearly_exercise": time_range_stats["yearly"]["exercise_minutes"],
        "yearly_luogu": time_range_stats["yearly"]["luogu_solved"],
        
        "total_study": time_range_stats["total"]["study_minutes"],
        "total_exercise": time_range_stats["total"]["exercise_minutes"],
        "total_luogu": time_range_stats["total"]["luogu_solved"]
    }

@router.post("/chat", response_model=ChatResponse)
def post_chat_message(payload: ChatRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. 获取系统配置（获取 API Key 及当前所处模式）
    settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    api_key = settings.deepseek_api_key if settings else None
    api_base = settings.deepseek_api_base if settings else "https://api.deepseek.com/v1"
    api_model = settings.deepseek_model if settings else "deepseek-v4-flash"
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
    
    # 4. 收集各周期自律统计指标
    today_stats = compile_ai_context_stats(db)
    
    # 5. 调用 AI Agent 生成回复
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
        memories_used=memories_used,
        user_message_id=user_msg.id,
        ai_message_id=ai_msg.id
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

@router.put("/chat/memories/{memory_id}", response_model=BrainMemoryResponse)
def update_memory(memory_id: int, payload: BrainMemoryUpdate, db: Session = Depends(get_db)):
    """更新某条记忆碎片的内容"""
    memory = db.query(BrainMemory).filter(BrainMemory.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="记忆不存在")
    
    if payload.key_concept is not None:
        memory.key_concept = payload.key_concept
    if payload.content is not None:
        memory.content = payload.content
    if payload.importance_score is not None:
        memory.importance_score = payload.importance_score
        
    memory.updated_at = datetime.now()
    db.commit()
    db.refresh(memory)
    return memory

@router.delete("/chat/messages/{message_id}")
def delete_chat_message(message_id: int, db: Session = Depends(get_db)):
    """删除单条聊天记录。如果删除的是用户消息，则连带删除紧随其后的 AI 回复"""
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="消息不存在")
    
    if msg.sender == "user":
        # 查找紧随其后的下一条消息 (即回复)
        next_msg = db.query(ChatMessage).filter(ChatMessage.id > msg.id).order_by(ChatMessage.id.asc()).first()
        if next_msg and next_msg.sender == "link":
            db.delete(next_msg)
            
    db.delete(msg)
    db.commit()
    return {"detail": "消息已删除"}

@router.put("/chat/messages/{message_id}", response_model=MessageUpdateResponse)
def edit_chat_message(message_id: int, payload: MessageUpdateRequest, db: Session = Depends(get_db)):
    """编辑最近的一条用户消息，并重新生成 AI 回复"""
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="消息不存在")
        
    if msg.sender != "user":
        raise HTTPException(status_code=400, detail="仅支持编辑用户发送的消息")
        
    # 校验是否为最近的一回用户消息：检查是否存在更新的用户消息
    newer_user_msg = db.query(ChatMessage).filter(ChatMessage.sender == "user", ChatMessage.id > msg.id).first()
    if newer_user_msg:
        raise HTTPException(status_code=400, detail="只能编辑最近发送的一条用户消息")
        
    # 1. 更新用户消息内容
    msg.text = payload.text
    
    # 2. 删除紧随其后的原本 AI 回复 (如果有的话)
    next_msg = db.query(ChatMessage).filter(ChatMessage.id > msg.id).order_by(ChatMessage.id.asc()).first()
    if next_msg and next_msg.sender == "link":
        db.delete(next_msg)
        
    db.commit()
    
    # 3. 从数据库中拉取历史聊天记录 (用于 AI 上下文，不包含当前编辑的这一条)
    chat_history = db.query(ChatMessage).filter(ChatMessage.id < msg.id).order_by(ChatMessage.id.asc()).all()
    
    # 4. 获取当前配置并拼装统计数据
    settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    api_key = settings.deepseek_api_key if settings else None
    api_base = settings.deepseek_api_base if settings else "https://api.deepseek.com/v1"
    api_model = settings.deepseek_model if settings else "deepseek-v4-flash"
    mode_name = settings.current_mode if settings else "cozy"
    
    mode = db.query(LifeMode).filter(LifeMode.name == mode_name).first()
    mode_display = mode.display_name if mode else "日常自律模式"
    mode_prompt = mode.ai_system_prompt if mode else ""
    
    today_stats = compile_ai_context_stats(db)
    
    # 5. 重新调用 AI Agent 生成回复
    reply, memories_used, hologram_state = generate_ai_reply(
        db=db,
        api_key=api_key,
        api_base_url=api_base,
        model_name=api_model,
        user_message=payload.text,
        chat_history=chat_history,
        current_mode_name=mode_display,
        current_mode_prompt=mode_prompt,
        today_stats=today_stats
    )
    
    # 6. 保存新的 AI 回复消息到数据库
    ai_msg = ChatMessage(
        sender="link",
        text=reply,
        timestamp=datetime.now(),
        state=hologram_state
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(msg)
    db.refresh(ai_msg)
    
    return MessageUpdateResponse(
        user_message=msg,
        ai_message=ai_msg
    )
