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
from app.models import LifeMode, SystemSetting, StudyRecord, DailyMetric, FinancialRecord

# 使用临时文件 SQLite 进行隔离测试，避免 :memory: 的多连接隔离问题
import os
SQLALCHEMY_DATABASE_URL = "sqlite:///test_link.db"

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

def teardown_module(module):
    """
    测试结束清理测试数据库。
    """
    if os.path.exists("test_link.db"):
        try:
            os.remove("test_link.db")
        except Exception as e:
            print(f"Failed to remove test database: {e}")

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

def test_update_settings_with_new_fields():
    payload = {
        "current_mode": "cozy",
        "luogu_uid": "12345",
        "luogu_total_solved": 100,
        "deepseek_api_key": "test-key",
        "push_deer_key": "deer-key",
        "bark_key": "bark-key",
        "reminder_time": "23:00",
        "reminder_enabled": True,
        "deepseek_api_base": "https://api.custom-url.com/v1",
        "deepseek_model": "deepseekv4flash"
    }
    response = client.put("/api/settings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["deepseek_api_base"] == "https://api.custom-url.com/v1"
    assert data["deepseek_model"] == "deepseekv4flash"

from unittest.mock import patch

def test_chat_endpoints_history_persistence():
    # 1. 确认初始聊天历史为空
    response = client.get("/api/chat/history")
    assert response.status_code == 200
    assert len(response.json()) == 0

    # 2. Mock 掉大模型回复与记忆异步提取，防止网络调用
    with patch("app.api.chat.generate_ai_reply") as mock_generate, \
         patch("app.api.chat.run_memory_extraction_task") as mock_extract:
        
        mock_generate.return_value = ("你好，我是 Link。", [], "active")
        
        payload = {"message": "我叫方成成"}
        response = client.post("/api/chat", json=payload)
        assert response.status_code == 200
        chat_data = response.json()
        assert chat_data["reply"] == "你好，我是 Link。"
        assert chat_data["hologram_state"] == "active"
        
    # 3. 验证聊天记录已持久化 (用户+AI共两条)
    response = client.get("/api/chat/history")
    assert response.status_code == 200
    history = response.json()
    assert len(history) == 2
    assert history[0]["sender"] == "user"
    assert history[0]["text"] == "我叫方成成"
    assert history[1]["sender"] == "link"
    assert history[1]["text"] == "你好，我是 Link。"

    # 4. 清空聊天历史
    response = client.delete("/api/chat/history")
    assert response.status_code == 200

    # 5. 验证是否清空成功
    response = client.get("/api/chat/history")
    assert response.status_code == 200
    assert len(response.json()) == 0

from app.models import BrainMemory

def test_delete_memory():
    # 1. 插入一条测试记忆
    db = TestingSessionLocal()
    mem = BrainMemory(key_concept="测试概念", content="测试内容", importance_score=3)
    db.add(mem)
    db.commit()
    db.refresh(mem)
    mem_id = mem.id
    db.close()

    # 2. 验证其已出现在列表中
    response = client.get("/api/chat/memories")
    assert response.status_code == 200
    assert any(m["id"] == mem_id for m in response.json())

    # 3. 调用删除记忆接口
    response = client.delete(f"/api/chat/memories/{mem_id}")
    assert response.status_code == 200
    assert response.json()["detail"] == "记忆碎片已从脑海中抹除"

    # 4. 再次检索验证已被删除
    response = client.get("/api/chat/memories")
    assert response.status_code == 200
    assert not any(m["id"] == mem_id for m in response.json())

import json
from datetime import date

def test_luogu_sync_and_heatmap_flow():
    # 模拟洛谷爬虫返回的数据
    mock_profile_data = {
        "passed_count": 141,
        "daily_counts": {
            "2026-04-01": [3, 2],  # 3题，最高难度 2 (普及-)
            "2026-04-08": [6, 1],  # 6题，最高难度 1 (入门)
        },
        "difficulty_stats": {
            "0": 0,
            "1": 29,
            "2": 85,
            "3": 27,
            "4": 0,
            "5": 0,
            "6": 0,
            "7": 0
        }
    }

    # 1. 插入 StudyRecord 供 heatmap 校验
    db = TestingSessionLocal()
    db.add(StudyRecord(
        duration_minutes=45,
        category="coding",
        description="写点代码",
        date=date.fromisoformat("2026-04-01")
    ))
    db.add(StudyRecord(
        duration_minutes=30,
        category="代码/刷题",
        description="洛谷刷题",
        date=date.fromisoformat("2026-04-01")
    ))
    db.add(StudyRecord(
        duration_minutes=60,
        category="study",
        description="看书",
        date=date.fromisoformat("2026-04-01")
    ))
    # 填充 luogu_uid
    setting = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    if setting:
        setting.luogu_uid = "2110485"
        setting.luogu_total_solved = 0
    db.commit()
    db.close()

    # 2. 调用同步洛谷接口并 Mock 爬虫返回
    with patch("app.api.records.scrape_luogu_user_profile") as mock_scrape:
        mock_scrape.return_value = mock_profile_data
        
        response = client.post("/api/records/luogu/sync")
        assert response.status_code == 200
        data = response.json()
        assert "同步成功" in data["detail"] or "绑定成功" in data["detail"]
        assert data["current_solved"] == 141

    # 3. 检查本地数据库是否保存了这些字段
    db = TestingSessionLocal()
    setting = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    assert setting.luogu_total_solved == 141
    stats_dict = json.loads(setting.luogu_difficulty_stats)
    assert stats_dict["2"] == 85
    assert stats_dict["3"] == 27

    # 验证历史做题数据自动填充到了 daily_metrics 里
    metric_1 = db.query(DailyMetric).filter(DailyMetric.date == date.fromisoformat("2026-04-01")).first()
    assert metric_1 is not None
    assert metric_1.luogu_solved_count == 3
    assert metric_1.luogu_max_difficulty == 2
    db.close()

    # 4. 检查热力图接口返回
    response = client.get("/api/records/heatmap?days=90")
    assert response.status_code == 200
    heatmap_data = response.json()
    
    assert "difficulty_stats" in heatmap_data
    assert heatmap_data["difficulty_stats"]["2"] == 85
    
    points = heatmap_data["points"]
    point_4_01 = next((p for p in points if p["date"] == "2026-04-01"), None)
    assert point_4_01 is not None
    assert point_4_01["luogu_solved"] == 3
    assert point_4_01["luogu_max_difficulty"] == 2
    assert point_4_01["coding_minutes"] == 75
    assert point_4_01["study_minutes"] == 60
    assert "expense" not in point_4_01

def test_stats_endpoint_with_time_ranges():
    db = TestingSessionLocal()
    from datetime import date, timedelta
    today = date.today()
    last_week = today - timedelta(days=today.weekday() + 2)
    
    db.add(StudyRecord(duration_minutes=30, category="study", description="今天学习", date=today))
    db.add(StudyRecord(duration_minutes=45, category="exercise", description="今天运动", date=today))
    db.add(StudyRecord(duration_minutes=60, category="study", description="上周学习", date=last_week))
    
    db.add(FinancialRecord(type="expense", amount=15.5, category="food", description="今天开销", date=today))
    db.add(FinancialRecord(type="income", amount=100.0, category="work", description="今天收入", date=today))
    db.add(FinancialRecord(type="expense", amount=50.0, category="rent", description="上周支出", date=last_week))
    
    db.add(DailyMetric(date=today, luogu_solved_count=2))
    db.add(DailyMetric(date=last_week, luogu_solved_count=5))
    
    # 填充 system_setting 中的 luogu_total_solved
    setting = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    if setting:
        setting.luogu_total_solved = 7
        
    db.commit()
    db.close()
    
    response = client.get("/api/records/stats")
    assert response.status_code == 200
    data = response.json()
    
    assert "time_range_stats" in data
    time_stats = data["time_range_stats"]
    
    assert "daily" in time_stats
    assert time_stats["daily"]["study_minutes"] == 30
    assert time_stats["daily"]["exercise_minutes"] == 45
    assert time_stats["daily"]["luogu_solved"] == 2
    assert time_stats["daily"]["expense"] == 15.5
    assert time_stats["daily"]["income"] == 100.0
    
    assert "weekly" in time_stats
    assert time_stats["weekly"]["study_minutes"] == 30
    assert time_stats["weekly"]["exercise_minutes"] == 45
    
    assert "total" in time_stats
    assert time_stats["total"]["study_minutes"] == 90
    assert time_stats["total"]["exercise_minutes"] == 45
    assert time_stats["total"]["luogu_solved"] == 7
    assert time_stats["total"]["expense"] == 65.5
    assert time_stats["total"]["income"] == 100.0

def test_chat_edit_delete():
    # 1. 确认初始状态
    response = client.delete("/api/chat/history")
    assert response.status_code == 200

    # 2. Mock 方式发送两条对话记录
    with patch("app.api.chat.generate_ai_reply") as mock_generate:
        mock_generate.return_value = ("你好！我是 Link。", [], "active")
        
        payload = {"message": "你好"}
        response = client.post("/api/chat", json=payload)
        assert response.status_code == 200
        
    history = client.get("/api/chat/history").json()
    assert len(history) == 2
    user_msg_id = history[0]["id"]
    ai_msg_id = history[1]["id"]
    
    # 3. 测试编辑用户消息
    with patch("app.api.chat.generate_ai_reply") as mock_generate:
        mock_generate.return_value = ("已为你重新载入系统。", [], "calm")
        
        payload_edit = {"text": "重新唤醒系统"}
        response = client.put(f"/api/chat/messages/{user_msg_id}", json=payload_edit)
        assert response.status_code == 200
        edit_data = response.json()
        assert edit_data["user_message"]["text"] == "重新唤醒系统"
        assert edit_data["ai_message"]["text"] == "已为你重新载入系统。"
        
    # 4. 再次查看历史，应该仍为 2 条，且内容更新
    history = client.get("/api/chat/history").json()
    assert len(history) == 2
    assert history[0]["text"] == "重新唤醒系统"
    assert history[1]["text"] == "已为你重新载入系统。"
    
    # 5. 测试删除消息极其级联回复
    response = client.delete(f"/api/chat/messages/{user_msg_id}")
    assert response.status_code == 200
    
    # 6. 历史记录应该全空了
    history = client.get("/api/chat/history").json()
    assert len(history) == 0

