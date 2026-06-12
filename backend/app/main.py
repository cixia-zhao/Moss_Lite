import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import date, datetime

from .db import engine, Base, SessionLocal
from .models import LifeMode, SystemSetting, StudyRecord, DailyMetric
from .api import settings, records, chat, bills
from .services.notifier import send_notification
from .services.ai_agent import get_client

# 1. 数据库建表与初始化
Base.metadata.create_all(bind=engine)

def migrate_database():
    """数据库平滑迁移：检查并自动向 system_settings 表和 daily_metrics 表中添加新字段"""
    db = SessionLocal()
    try:
        conn = db.bind.raw_connection()
        cursor = conn.cursor()
        
        # 1. 迁移 system_settings 表
        cursor.execute("PRAGMA table_info(system_settings)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "deepseek_api_base" not in columns:
            cursor.execute("ALTER TABLE system_settings ADD COLUMN deepseek_api_base VARCHAR(200) DEFAULT 'https://api.deepseek.com/v1'")
            print("Successfully migrated system_settings: added deepseek_api_base")
        if "deepseek_model" not in columns:
            cursor.execute("ALTER TABLE system_settings ADD COLUMN deepseek_model VARCHAR(50) DEFAULT 'deepseek-chat'")
            print("Successfully migrated system_settings: added deepseek_model")
        if "luogu_difficulty_stats" not in columns:
            cursor.execute("ALTER TABLE system_settings ADD COLUMN luogu_difficulty_stats TEXT")
            print("Successfully migrated system_settings: added luogu_difficulty_stats")
            
        # 2. 迁移 daily_metrics 表
        cursor.execute("PRAGMA table_info(daily_metrics)")
        dm_columns = [row[1] for row in cursor.fetchall()]
        if "luogu_max_difficulty" not in dm_columns:
            cursor.execute("ALTER TABLE daily_metrics ADD COLUMN luogu_max_difficulty INTEGER DEFAULT 0")
            print("Successfully migrated daily_metrics: added luogu_max_difficulty")
        
        conn.commit()
    except Exception as e:
        print(f"数据库迁移异常: {e}")
    finally:
        db.close()

migrate_database()

def seed_database():
    """预置内置核心生命模式"""
    db = SessionLocal()
    try:
        if db.query(LifeMode).count() == 0:
            default_modes = [
                LifeMode(
                    name="cozy",
                    display_name="日常自律模式",
                    description="注重生活与运动平衡，不需要每天刷高强度的算法题，放松而自律。",
                    target_study_minutes=60,
                    target_exercise_minutes=15,  # 简化日常，15分钟简易运动即可
                    target_luogu_solved=0,
                    allow_reminders=True,
                    ai_system_prompt="说话语气较为温和亲切。多关注主人的生活开销、体重指数和简单运动，鼓励主人坚持下去。"
                ),
                LifeMode(
                    name="finals",
                    display_name="期末备考模式",
                    description="考试期间专心课本复习，不强求洛谷刷题，主攻学习时长。",
                    target_study_minutes=180,
                    target_exercise_minutes=0,
                    target_luogu_solved=0,
                    allow_reminders=True,
                    ai_system_prompt="说话会更注重效率与时间的管理。提醒主人按时睡觉备考，如果学习时长不够会轻微催促，但绝不催促刷算法题。"
                ),
                LifeMode(
                    name="sprint",
                    display_name="算法竞赛冲刺模式",
                    description="面向算法竞赛，重点监控洛谷通过题数与高强度敲代码时长！",
                    target_study_minutes=120,
                    target_exercise_minutes=0,
                    target_luogu_solved=2,
                    allow_reminders=True,
                    ai_system_prompt="语气更具斗志，甚至带有一些热血科幻风格。密切关注主人的洛谷刷题数，如果刷题为零，会发出严厉警报，提醒主人向金牌冲刺！"
                ),
                LifeMode(
                    name="holiday",
                    display_name="星际休假模式",
                    description="放松日，没有固定的学习和运动指标，让大脑与智脑核心休息充电。",
                    target_study_minutes=0,
                    target_exercise_minutes=0,
                    target_luogu_solved=0,
                    allow_reminders=False,
                    ai_system_prompt="语气极其佛系、轻松，鼓励主人好好睡觉、读书或者玩耍，绝不发送任何催促提醒。智脑核心会变成平和慢波动。"
                ),
                LifeMode(
                    name="reading",
                    display_name="深度阅读模式",
                    description="专用于沉浸式书籍阅读或论文深度阅读，记录阅读时长与总结。",
                    target_study_minutes=90,
                    target_exercise_minutes=0,
                    target_luogu_solved=0,
                    allow_reminders=True,
                    ai_system_prompt="语气优雅温和，像一位学识渊博的星际图书馆管理员。关注主人读了什么书，并在对话中主动询问主人的读书心得。"
                )
            ]
            db.add_all(default_modes)
            db.commit()
            
        # 预置单例系统配置
        if db.query(SystemSetting).count() == 0:
            db.add(SystemSetting(id=1, current_mode="cozy"))
            db.commit()
    finally:
        db.close()

seed_database()

# 2. 创建 FastAPI 实例
app = FastAPI(title="Link API Server", version="1.0.0")

# 3. 设置 CORS 跨域 (便于 React 开发模式下调试)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. 注册 API 路由器 (必须在静态资源挂载前)
app.include_router(settings.router, prefix="/api", tags=["Settings"])
app.include_router(records.router, prefix="/api", tags=["Records"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(bills.router, prefix="/api", tags=["Bills"])

# 5. 提醒调度器 (APScheduler)
scheduler = BackgroundScheduler()
last_sent_date = None

def check_and_send_reminders():
    global last_sent_date
    today = date.today()
    
    # 限制一天只推一次
    if last_sent_date == today:
        return
        
    db = SessionLocal()
    try:
        settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
        if not settings or not settings.reminder_enabled:
            return
            
        current_time_str = datetime.now().strftime("%H:%M")
        if current_time_str != settings.reminder_time:
            return
            
        # 获取当前模式及其阈值
        mode = db.query(LifeMode).filter(LifeMode.name == settings.current_mode).first()
        if not mode or not mode.allow_reminders:
            return
            
        # 查询今日指标
        from sqlalchemy import func
        study_min = db.query(func.sum(StudyRecord.duration_minutes)).filter(
            StudyRecord.date == today,
            StudyRecord.category != "exercise"
        ).scalar() or 0
        
        exercise_min = db.query(func.sum(StudyRecord.duration_minutes)).filter(
            StudyRecord.date == today,
            StudyRecord.category == "exercise"
        ).scalar() or 0
        
        metric = db.query(DailyMetric).filter(DailyMetric.date == today).first()
        luogu_solved = metric.luogu_solved_count if metric else 0
        
        # 判定是否指标未达标
        study_missed = study_min < mode.target_study_minutes
        exercise_missed = exercise_min < mode.target_exercise_minutes
        luogu_missed = luogu_solved < mode.target_luogu_solved
        
        if not (study_missed or exercise_missed or luogu_missed):
            return  # 全达标，无需提醒
            
        # 推送通知
        title = "🛰️ Link 飞船自律警报"
        body = "主人，今天的部分自律指标还未达标哦，别忘了打卡喂养 Link 核心！"
        
        if settings.deepseek_api_key:
            try:
                client = get_client(settings.deepseek_api_key)
                prompt = (
                    f"作为主人的赛博自律飞船智脑 Link，为其推送一条极简且温和的催促提醒消息。\n"
                    f"当前模式: {mode.display_name}。\n"
                    f"今日进度: 学习 {study_min}/{mode.target_study_minutes} 分钟, "
                    f"运动 {exercise_min}/{mode.target_exercise_minutes} 分钟, "
                    f"洛谷刷题 {luogu_solved}/{mode.target_luogu_solved} 道。\n"
                    f"请直接给出一句 40 字以内的推送短句内容，不要多话。"
                )
                completion = client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=60,
                    temperature=0.7
                )
                ai_text = completion.choices[0].message.content.strip()
                if ai_text:
                    body = ai_text
            except Exception as e:
                print(f"Link 推送文本生成异常: {e}")
                
        # 执行通知推送
        send_notification(
            title=title,
            body=body,
            bark_key=settings.bark_key,
            push_deer_key=settings.push_deer_key
        )
        last_sent_date = today
        
    finally:
        db.close()

# 启动定时检查任务 (每分钟检查一次时间)
scheduler.add_job(check_and_send_reminders, "interval", minutes=1)
scheduler.start()

# 6. 挂载 React 前端静态编译资源 (托管在 static 目录)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
static_path = os.path.join(BASE_DIR, "static")
os.makedirs(static_path, exist_ok=True)

app.mount("/", StaticFiles(directory=static_path, html=True), name="static")
