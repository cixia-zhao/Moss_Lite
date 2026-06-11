from pydantic import BaseModel, Field
import datetime as dt
from typing import Optional, List

# --- LifeMode Schemas ---
class LifeModeBase(BaseModel):
    name: str = Field(..., max_length=50, description="模式标识符")
    display_name: str = Field(..., max_length=100, description="展示名称")
    description: Optional[str] = None
    target_study_minutes: int = 0
    target_exercise_minutes: int = 0
    target_luogu_solved: int = 0
    allow_reminders: bool = True
    ai_system_prompt: Optional[str] = None

class LifeModeCreate(LifeModeBase):
    pass

class LifeModeUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    target_study_minutes: Optional[int] = None
    target_exercise_minutes: Optional[int] = None
    target_luogu_solved: Optional[int] = None
    allow_reminders: Optional[bool] = None
    ai_system_prompt: Optional[str] = None

class LifeModeResponse(LifeModeBase):
    id: int

    class Config:
        from_attributes = True

# --- StudyRecord Schemas ---
class StudyRecordBase(BaseModel):
    start_time: Optional[dt.datetime] = None
    end_time: Optional[dt.datetime] = None
    duration_minutes: int
    category: str = "study"
    description: Optional[str] = None
    date: Optional[dt.date] = None

class StudyRecordCreate(StudyRecordBase):
    pass

class StudyRecordResponse(StudyRecordBase):
    id: int

    class Config:
        from_attributes = True

# --- FinancialRecord Schemas ---
class FinancialRecordBase(BaseModel):
    type: str = Field(..., description="'expense' 支出 或 'income' 收入")
    amount: float
    category: str
    source: str = "manual"
    description: Optional[str] = None
    date: Optional[dt.date] = None

class FinancialRecordCreate(FinancialRecordBase):
    pass

class FinancialRecordResponse(FinancialRecordBase):
    id: int
    created_at: dt.datetime

    class Config:
        from_attributes = True

# --- DailyMetric Schemas ---
class DailyMetricBase(BaseModel):
    weight: Optional[float] = None
    height: Optional[float] = None
    bmi: Optional[float] = None
    luogu_solved_count: int = 0
    overall_rating: str = "B"
    user_mood: Optional[str] = None
    ai_diary_review: Optional[str] = None

class DailyMetricUpdate(BaseModel):
    weight: Optional[float] = None
    height: Optional[float] = None
    luogu_solved_count: Optional[int] = None
    user_mood: Optional[str] = None
    ai_diary_review: Optional[str] = None

class DailyMetricResponse(DailyMetricBase):
    date: dt.date

    class Config:
        from_attributes = True

# --- BrainMemory Schemas ---
class BrainMemoryBase(BaseModel):
    key_concept: str
    content: str
    importance_score: int = 3

class BrainMemoryCreate(BrainMemoryBase):
    pass

class BrainMemoryResponse(BrainMemoryBase):
    id: int
    created_at: dt.datetime
    updated_at: dt.datetime
    last_referenced_at: Optional[dt.datetime] = None

    class Config:
        from_attributes = True

# --- Chat Schemas ---
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    hologram_state: str  # 'active' (活跃), 'calm' (平和), 'glitch' (故障), 'loading' (计时/思考中)
    memories_used: List[str] = []

# --- SystemSettings Schemas (存放在 settings 中) ---
class SystemSettings(BaseModel):
    current_mode: str = "cozy"
    luogu_uid: Optional[str] = None
    luogu_total_solved: int = 0
    deepseek_api_key: Optional[str] = None
    push_deer_key: Optional[str] = None
    bark_key: Optional[str] = None
    reminder_time: str = "22:00"  # 每天推送时间
    reminder_enabled: bool = True

# --- FutureEvent Schemas ---
class FutureEventBase(BaseModel):
    date: dt.date
    title: str = Field(..., max_length=100)
    description: Optional[str] = None

class FutureEventCreate(FutureEventBase):
    pass

class FutureEventResponse(FutureEventBase):
    id: int
    created_at: dt.datetime

    class Config:
        from_attributes = True
