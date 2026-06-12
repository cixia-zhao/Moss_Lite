from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, Float
from datetime import datetime, date
from .db import Base

class LifeMode(Base):
    __tablename__ = "life_modes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)  # 模式代号 (如 finals, sprint, reading)
    display_name = Column(String(100), nullable=False)                 # 模式展示名称 (如 期末备考模式)
    description = Column(Text)                                         # 模式介绍描述
    target_study_minutes = Column(Integer, default=0)                  # 每日目标学习分钟数
    target_exercise_minutes = Column(Integer, default=0)               # 每日目标运动分钟数
    target_luogu_solved = Column(Integer, default=0)                   # 每日目标洛谷解题数
    allow_reminders = Column(Boolean, default=True)                    # 是否允许在此模式下发送催促提醒
    ai_system_prompt = Column(Text)                                    # 智脑在此模式下的系统角色提示词

class StudyRecord(Base):
    __tablename__ = "study_records"
    
    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, nullable=True)                       # 专注开始时间
    end_time = Column(DateTime, nullable=True)                         # 专注结束时间
    duration_minutes = Column(Integer, nullable=False)                 # 专注时长(分钟)
    category = Column(String(50), default="study")                     # 分类 (如 study, reading, coding)
    description = Column(Text)                                         # 备注信息
    date = Column(Date, default=date.today, index=True)                # 记录日期

class FinancialRecord(Base):
    __tablename__ = "financial_records"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(10), nullable=False)                          # "expense" (支出) 或 "income" (收入)
    amount = Column(Float, nullable=False)                             # 金额
    category = Column(String(50), nullable=False)                      # 账单分类 (如 餐饮, 娱乐, 学习, 工资)
    source = Column(String(50), default="manual")                      # 来源: manual (手动), csv_alipay (支付宝), csv_wechat (微信)
    description = Column(Text)                                         # 消费描述
    created_at = Column(DateTime, default=datetime.now)                # 记录创建时间
    date = Column(Date, default=date.today, index=True)                # 消费发生日期

class DailyMetric(Base):
    __tablename__ = "daily_metrics"
    
    date = Column(Date, primary_key=True, index=True)                  # 日期主键
    weight = Column(Float, nullable=True)                              # 体重 (kg)
    height = Column(Float, nullable=True)                              # 身高 (cm)
    bmi = Column(Float, nullable=True)                                 # 体重指数 BMI
    luogu_solved_count = Column(Integer, default=0)                    # 当天洛谷过题数
    luogu_max_difficulty = Column(Integer, default=0)                  # 当天洛谷最高难度
    overall_rating = Column(String(5), default="B")                    # 综合评级 (A, B, C, D)
    user_mood = Column(String(20), nullable=True)                      # 心情心情 (happy, tired, anxious, relaxed)
    ai_diary_review = Column(Text, nullable=True)                      # 智脑每日点评日志

class BrainMemory(Base):
    __tablename__ = "brain_memories"
    
    id = Column(Integer, primary_key=True, index=True)
    key_concept = Column(String(100), nullable=False, index=True)      # 记忆的核心概念 (如: 考研, 算法竞赛)
    content = Column(Text, nullable=False)                             # 记忆详情
    importance_score = Column(Integer, default=3)                      # 重要评分 (1-5)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    last_referenced_at = Column(DateTime, nullable=True)               # 最近一次被对话检索的时间

class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, default=1)                  # 始终为 1
    current_mode = Column(String(50), default="cozy")                  # 当前所处模式
    luogu_uid = Column(String(50), nullable=True)                      # 洛谷 UID
    luogu_total_solved = Column(Integer, default=0)                    # 洛谷上一次记录的累计过题数
    luogu_difficulty_stats = Column(Text, nullable=True)               # 洛谷难度分布统计 JSON 字符串
    deepseek_api_key = Column(String(100), nullable=True)              # DeepSeek API Key
    push_deer_key = Column(String(100), nullable=True)                # PushDeer 推送 Key
    bark_key = Column(String(100), nullable=True)                      # Bark 推送 Key
    reminder_time = Column(String(10), default="22:00")                # 每日推送提醒时间
    reminder_enabled = Column(Boolean, default=True)                   # 是否开启推送
    deepseek_api_base = Column(String(200), default="https://api.deepseek.com/v1")  # API 基地址
    deepseek_model = Column(String(50), default="deepseek-v4-flash")   # 对话模型名称

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String(20), nullable=False)                        # "user" 或 "link"
    text = Column(Text, nullable=False)                                # 消息内容
    timestamp = Column(DateTime, default=datetime.now)                 # 发送时间
    state = Column(String(20), nullable=True)                          # AI 状态球波形样式

class FutureEvent(Base):
    __tablename__ = "future_events"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)                    # 目标未来日期
    title = Column(String(100), nullable=False)                        # 事件标题 (如 六级考试)
    description = Column(Text, nullable=True)                          # 事件详情目标或备注
    created_at = Column(DateTime, default=datetime.now)                # 创建时间

