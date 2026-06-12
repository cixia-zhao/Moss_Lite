from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..db import get_db
from ..models import SystemSetting, LifeMode
from ..schemas import SystemSettings, LifeModeResponse, LifeModeCreate, LifeModeUpdate

router = APIRouter()

def get_or_create_settings(db: Session) -> SystemSetting:
    settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    if not settings:
        settings = SystemSetting(id=1, current_mode="cozy")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.get("/settings", response_model=SystemSettings)
def get_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)

@router.put("/settings", response_model=SystemSettings)
def update_settings(payload: SystemSettings, db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    
    # 更新字段
    settings.current_mode = payload.current_mode
    settings.luogu_uid = payload.luogu_uid
    settings.luogu_total_solved = payload.luogu_total_solved
    settings.luogu_difficulty_stats = payload.luogu_difficulty_stats
    settings.deepseek_api_key = payload.deepseek_api_key
    settings.push_deer_key = payload.push_deer_key
    settings.bark_key = payload.bark_key
    settings.reminder_time = payload.reminder_time
    settings.reminder_enabled = payload.reminder_enabled
    settings.deepseek_api_base = payload.deepseek_api_base
    settings.deepseek_model = payload.deepseek_model

    db.commit()
    db.refresh(settings)
    return settings

@router.get("/modes", response_model=List[LifeModeResponse])
def get_modes(db: Session = Depends(get_db)):
    return db.query(LifeMode).all()

@router.post("/modes", response_model=LifeModeResponse)
def create_mode(payload: LifeModeCreate, db: Session = Depends(get_db)):
    # 检查是否重名
    existing = db.query(LifeMode).filter(LifeMode.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="模式名称（标识符）已存在")
        
    db_mode = LifeMode(**payload.model_dump())
    db.add(db_mode)
    db.commit()
    db.refresh(db_mode)
    return db_mode

@router.put("/modes/{mode_id}", response_model=LifeModeResponse)
def update_mode(mode_id: int, payload: LifeModeUpdate, db: Session = Depends(get_db)):
    db_mode = db.query(LifeMode).filter(LifeMode.id == mode_id).first()
    if not db_mode:
        raise HTTPException(status_code=404, detail="模式不存在")
        
    # 不允许修改核心内置模式的 name 字段 (防止误删配置)
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_mode, key, value)
        
    db.commit()
    db.refresh(db_mode)
    return db_mode

@router.delete("/modes/{mode_id}")
def delete_mode(mode_id: int, db: Session = Depends(get_db)):
    db_mode = db.query(LifeMode).filter(LifeMode.id == mode_id).first()
    if not db_mode:
        raise HTTPException(status_code=404, detail="模式不存在")
        
    # 内置核心模式不允许删除
    core_modes = ["finals", "sprint", "cozy", "holiday", "reading"]
    if db_mode.name in core_modes:
        raise HTTPException(status_code=400, detail="核心内置模式不允许被删除")
        
    db.delete(db_mode)
    db.commit()
    return {"detail": "模式已成功删除"}
