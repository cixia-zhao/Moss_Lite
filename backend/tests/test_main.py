import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import sys
import os
# 将 backend 目录添加到 sys.path 中，以便进行绝对导入
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.db import Base, get_db
# 必须导入 models 模块以注册所有 SQLAlchemy 数据表模型到 Base.metadata
from app import models
from app.models import LifeMode, SystemSetting

# 使用临时文件 SQLite 进行隔离测试，避免 :memory: 的多连接隔离问题
import os
SQLALCHEMY_DATABASE_URL = "sqlite:///test_moss_lite.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 重写数据库会话依赖注入
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    
    # 填充测试数据
    db = TestingSessionLocal()
    if db.query(LifeMode).count() == 0:
        db.add(LifeMode(
            name="cozy",
            display_name="日常自律模式",
            target_study_minutes=60,
            target_exercise_minutes=15,
            target_luogu_solved=0,
            allow_reminders=True
        ))
        db.add(SystemSetting(id=1, current_mode="cozy"))
        db.commit()
    db.close()
    
    yield
    
    # 清理所有表并删除测试临时文件
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("test_moss_lite.db"):
        try:
            os.remove("test_moss_lite.db")
        except Exception:
            pass

client = TestClient(app)

def test_read_settings():
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert data["current_mode"] == "cozy"

def test_read_modes():
    response = client.get("/api/modes")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "cozy"

def test_update_settings():
    payload = {
        "current_mode": "cozy",
        "luogu_uid": "12345",
        "luogu_total_solved": 100,
        "deepseek_api_key": "test-key",
        "push_deer_key": "deer-key",
        "bark_key": "bark-key",
        "reminder_time": "23:00",
        "reminder_enabled": True
    }
    response = client.put("/api/settings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["luogu_uid"] == "12345"
    assert data["reminder_time"] == "23:00"
