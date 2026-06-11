from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List, Optional
from sqlalchemy import func

from ..db import get_db
from ..models import StudyRecord, FinancialRecord, DailyMetric, LifeMode, SystemSetting, FutureEvent
from ..schemas import (
    StudyRecordCreate, StudyRecordResponse,
    FinancialRecordCreate, FinancialRecordResponse,
    DailyMetricResponse, DailyMetricUpdate,
    FutureEventCreate, FutureEventResponse
)

router = APIRouter()

# --- 学习记录 (Study Records) ---

@router.get("/records/study", response_model=List[StudyRecordResponse])
def get_study_records(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(StudyRecord)
    if start_date:
        query = query.filter(StudyRecord.date >= start_date)
    if end_date:
        query = query.filter(StudyRecord.date <= end_date)
    return query.order_by(StudyRecord.date.desc(), StudyRecord.id.desc()).all()

@router.post("/records/study", response_model=StudyRecordResponse)
def create_study_record(payload: StudyRecordCreate, db: Session = Depends(get_db)):
    db_record = StudyRecord(**payload.model_dump())
    if not db_record.date:
        db_record.date = date.today()
        
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    
    # 录入学习记录后，更新 daily_metrics 表中的评级
    recalculate_daily_rating(db, db_record.date)
    
    return db_record

# --- 记账收支 (Financial Records) ---

@router.get("/records/finance", response_model=List[FinancialRecordResponse])
def get_financial_records(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(FinancialRecord)
    if start_date:
        query = query.filter(FinancialRecord.date >= start_date)
    if end_date:
        query = query.filter(FinancialRecord.date <= end_date)
    return query.order_by(FinancialRecord.date.desc(), FinancialRecord.id.desc()).all()

@router.post("/records/finance", response_model=FinancialRecordResponse)
def create_financial_record(payload: FinancialRecordCreate, db: Session = Depends(get_db)):
    db_record = FinancialRecord(**payload.model_dump())
    if not db_record.date:
        db_record.date = date.today()
        
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    
    # 更新当天评分
    recalculate_daily_rating(db, db_record.date)
    
    return db_record

@router.delete("/records/finance/{record_id}")
def delete_financial_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(FinancialRecord).filter(FinancialRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="账单不存在")
    target_date = record.date
    db.delete(record)
    db.commit()
    
    recalculate_daily_rating(db, target_date)
    return {"detail": "账单已删除"}

# --- 每日综合指标 (Daily Metrics) ---

@router.get("/records/daily/{target_date}", response_model=DailyMetricResponse)
def get_daily_metric(target_date: date, db: Session = Depends(get_db)):
    metric = db.query(DailyMetric).filter(DailyMetric.date == target_date).first()
    if not metric:
        # 如果不存在，初始化一条空白记录并返回
        metric = DailyMetric(date=target_date, weight=None, height=None, bmi=None, luogu_solved_count=0)
        db.add(metric)
        db.commit()
        db.refresh(metric)
    return metric

@router.put("/records/daily/{target_date}", response_model=DailyMetricResponse)
def update_daily_metric(target_date: date, payload: DailyMetricUpdate, db: Session = Depends(get_db)):
    metric = db.query(DailyMetric).filter(DailyMetric.date == target_date).first()
    if not metric:
        metric = DailyMetric(date=target_date)
        db.add(metric)
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(metric, key, value)
        
    # 计算 BMI
    if metric.weight and metric.height:
        height_m = metric.height / 100.0
        metric.bmi = round(metric.weight / (height_m ** 2), 1)
    else:
        metric.bmi = None
        
    db.commit()
    db.refresh(metric)
    
    # 重算当天评级
    recalculate_daily_rating(db, target_date)
    
    return metric

# --- 统计与热力图 API ---

@router.get("/records/stats")
def get_stats(db: Session = Depends(get_db)):
    """获取整体自律统计情况，包含不同周期维度的分类解析"""
    today = date.today()
    start_30 = today - timedelta(days=30)
    
    # 基础 30 天汇总 (兼容原代码)
    total_study = db.query(func.sum(StudyRecord.duration_minutes)).filter(StudyRecord.date >= start_30, StudyRecord.category != "exercise").scalar() or 0
    total_exercise = db.query(func.sum(StudyRecord.duration_minutes)).filter(StudyRecord.date >= start_30, StudyRecord.category == "exercise").scalar() or 0
    income_30 = db.query(func.sum(FinancialRecord.amount)).filter(FinancialRecord.date >= start_30, FinancialRecord.type == "income").scalar() or 0.0
    expense_30 = db.query(func.sum(FinancialRecord.amount)).filter(FinancialRecord.date >= start_30, FinancialRecord.type == "expense").scalar() or 0.0
    total_luogu = db.query(func.sum(DailyMetric.luogu_solved_count)).filter(DailyMetric.date >= start_30).scalar() or 0
    
    # 获取所有的专注记录用于构建高级聚合面板
    all_study_records = db.query(StudyRecord).all()
    
    # 定义时间维度的界限
    start_week = today - timedelta(days=today.weekday())
    start_month = today.replace(day=1)
    start_year = today.replace(month=1, day=1)
    
    stats_data = {
        "daily": {},
        "weekly": {},
        "monthly": {},
        "yearly": {},
        "total": {}
    }
    
    for r in all_study_records:
        cat = r.category or "study"
        # Total
        stats_data["total"][cat] = stats_data["total"].get(cat, 0) + r.duration_minutes
        # Daily
        if r.date == today:
            stats_data["daily"][cat] = stats_data["daily"].get(cat, 0) + r.duration_minutes
        # Weekly
        if r.date >= start_week:
            stats_data["weekly"][cat] = stats_data["weekly"].get(cat, 0) + r.duration_minutes
        # Monthly
        if r.date >= start_month:
            stats_data["monthly"][cat] = stats_data["monthly"].get(cat, 0) + r.duration_minutes
        # Yearly
        if r.date >= start_year:
            stats_data["yearly"][cat] = stats_data["yearly"].get(cat, 0) + r.duration_minutes

    return {
        "study_30days": total_study,
        "exercise_30days": total_exercise,
        "income_30days": round(income_30, 2),
        "expense_30days": round(expense_30, 2),
        "luogu_30days": total_luogu,
        "advanced_stats": stats_data
    }

@router.get("/records/heatmap")
def get_heatmap_data(days: int = Query(60, ge=15, le=365), db: Session = Depends(get_db)):
    """
    获取近 N 天的热力图网格数据点。
    返回每个日期的各维度具体数值与综合等级。
    """
    today = date.today()
    start_date = today - timedelta(days=days - 1)
    
    # 预加载此范围的所有数据，避免 N+1 查询
    study_records = db.query(StudyRecord).filter(StudyRecord.date >= start_date).all()
    finance_records = db.query(FinancialRecord).filter(FinancialRecord.date >= start_date).all()
    daily_metrics = db.query(DailyMetric).filter(DailyMetric.date >= start_date).all()
    
    # 按日期进行聚合
    study_map = {}
    exercise_map = {}
    for r in study_records:
        if r.category == "exercise":
            exercise_map[r.date] = exercise_map.get(r.date, 0) + r.duration_minutes
        else:
            study_map[r.date] = study_map.get(r.date, 0) + r.duration_minutes
            
    expense_map = {}
    for r in finance_records:
        if r.type == "expense":
            expense_map[r.date] = expense_map.get(r.date, 0.0) + r.amount
            
    metric_map = {m.date: m for m in daily_metrics}
    
    # 获取未来的占位和事件
    future_events_db = db.query(FutureEvent).filter(FutureEvent.date > today).all()
    events_map = {}
    max_future_date = today
    for ev in future_events_db:
        if ev.date not in events_map:
            events_map[ev.date] = []
        events_map[ev.date].append({"id": ev.id, "title": ev.title, "description": ev.description})
        if ev.date > max_future_date:
            max_future_date = ev.date
            
    end_date = max_future_date
        
    # 拼装结果数组 (过去与今天)
    points = []
    current = start_date
    while current <= today:
        metric = metric_map.get(current)
        study_min = study_map.get(current, 0)
        exercise_min = exercise_map.get(current, 0)
        luogu_solved = metric.luogu_solved_count if metric else 0
        expense_val = expense_map.get(current, 0.0)
        rating = metric.overall_rating if metric else "B"
        
        # 计算综合活跃得分 (用于热力图原始深浅度表示)
        combined_score = study_min + (exercise_min * 2) + (luogu_solved * 10)
        
        points.append({
            "date": current.isoformat(),
            "is_future": False,
            "study_minutes": study_min,
            "exercise_minutes": exercise_min,
            "luogu_solved": luogu_solved,
            "expense": round(expense_val, 2),
            "rating": rating,
            "combined_score": combined_score,
            "events": events_map.get(current, [])
        })
        current += timedelta(days=1)
        
    # 拼装未来预测天数
    current = today + timedelta(days=1)
    while current <= end_date:
        points.append({
            "date": current.isoformat(),
            "is_future": True,
            "study_minutes": 0,
            "exercise_minutes": 0,
            "luogu_solved": 0,
            "expense": 0.0,
            "rating": "N/A",
            "combined_score": 0,
            "events": events_map.get(current, [])
        })
        current += timedelta(days=1)
        
    return points

# --- 未来事件 CRUD ---
@router.get("/records/future_events", response_model=List[FutureEventResponse])
def get_future_events(db: Session = Depends(get_db)):
    return db.query(FutureEvent).filter(FutureEvent.date >= date.today()).order_by(FutureEvent.date.asc()).all()

@router.post("/records/future_events", response_model=FutureEventResponse)
def create_future_event(payload: FutureEventCreate, db: Session = Depends(get_db)):
    db_record = FutureEvent(**payload.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

@router.delete("/records/future_events/{event_id}")
def delete_future_event(event_id: int, db: Session = Depends(get_db)):
    record = db.query(FutureEvent).filter(FutureEvent.id == event_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="事件不存在")
    db.delete(record)
    db.commit()
    return {"detail": "事件已删除"}

# --- 辅助评级函数 ---

def recalculate_daily_rating(db: Session, target_date: date):
    """
    根据当天设定的生命模式目标，自动计算评级并更新数据库。
    """
    # 1. 查找系统当前设置的模式
    settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    mode_name = settings.current_mode if settings else "cozy"
    mode = db.query(LifeMode).filter(LifeMode.name == mode_name).first()
    
    if not mode:
        # 如果模式不存在，默认使用全 0 规则 (无压力，直接给 B/A)
        target_study = 0
        target_exercise = 0
        target_luogu = 0
    else:
        target_study = mode.target_study_minutes
        target_exercise = mode.target_exercise_minutes
        target_luogu = mode.target_luogu_solved

    # 2. 获取当天的实际数值
    study_min = db.query(func.sum(StudyRecord.duration_minutes)).filter(
        StudyRecord.date == target_date,
        StudyRecord.category != "exercise"
    ).scalar() or 0
    
    exercise_min = db.query(func.sum(StudyRecord.duration_minutes)).filter(
        StudyRecord.date == target_date,
        StudyRecord.category == "exercise"
    ).scalar() or 0
    
    metric = db.query(DailyMetric).filter(DailyMetric.date == target_date).first()
    luogu_solved = metric.luogu_solved_count if metric else 0

    # 3. 计算完成率并核对评级
    # 目标为 0 时自动视作 100% 完成
    study_ok = study_min >= target_study if target_study > 0 else True
    exercise_ok = exercise_min >= target_exercise if target_exercise > 0 else True
    luogu_ok = luogu_solved >= target_luogu if target_luogu > 0 else True

    # 简易评级规则：
    # 全部达标 = A
    # 任一未达标但平均完成度 > 50% = B
    # 严重摆烂 / 没学习没运动 = C
    # 如果今天是“休假模式 (holiday)”，只要支出没严重超支，自动拿 A 或 B
    if mode_name == "holiday":
        rating = "A" if exercise_min > 0 or study_min > 0 else "B"
    else:
        if study_ok and exercise_ok and luogu_ok:
            rating = "A"
        elif (study_min >= target_study * 0.5) or (luogu_solved > 0):
            rating = "B"
        else:
            rating = "C"

    # 4. 更新评级
    if not metric:
        metric = DailyMetric(date=target_date, overall_rating=rating)
        db.add(metric)
    else:
        metric.overall_rating = rating
        
    db.commit()

# --- 洛谷抓取与同步 API ---
from ..services.luogu_scraper import scrape_luogu_solved

@router.post("/records/luogu/sync")
def sync_luogu(db: Session = Depends(get_db)):
    """手动触发洛谷数据抓取，计算差额并存入数据库"""
    settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    if not settings or not settings.luogu_uid:
        raise HTTPException(status_code=400, detail="未配置洛谷 UID，请前往配置")
        
    uid = settings.luogu_uid
    try:
        current_solved = scrape_luogu_solved(uid)
        
        # 第一次绑定或底数为零
        if settings.luogu_total_solved == 0:
            settings.luogu_total_solved = current_solved
            db.commit()
            return {
                "detail": "洛谷绑定成功！已初始化累计题数底数", 
                "current_solved": current_solved, 
                "today_added": 0
            }
            
        today_added = current_solved - settings.luogu_total_solved
        
        # 异常情况重置
        if today_added < 0:
            settings.luogu_total_solved = current_solved
            db.commit()
            return {
                "detail": "洛谷累计题数发生异常倒退，已重置底数", 
                "current_solved": current_solved, 
                "today_added": 0
            }
            
        # 更新今天的过题数据
        today = date.today()
        metric = db.query(DailyMetric).filter(DailyMetric.date == today).first()
        if not metric:
            metric = DailyMetric(date=today, luogu_solved_count=today_added)
            db.add(metric)
        else:
            metric.luogu_solved_count = today_added  # 洛谷数据以今日累计最新相比最初的增量为主
            
        # 更新数据库中的历史累计数记录
        settings.luogu_total_solved = current_solved
        db.commit()
        
        # 重新评估自律评级
        recalculate_daily_rating(db, today)
        
        return {
            "detail": f"洛谷同步成功！今日新增通过 {today_added} 题",
            "current_solved": current_solved,
            "today_added": today_added
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"洛谷抓取失败: {str(e)}")

