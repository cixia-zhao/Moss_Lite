# 后端核心模块速查文档

> 最后更新：2026-06-13
> 覆盖文件：`backend/app/` 下的 `main.py`、`models.py`、`schemas.py`、`db.py` 和 `services/luogu_scraper.py`

## 模块职责

后端核心模块负责数据库模型定义、请求/响应格式校验、数据库连接管理、应用启动初始化，以及外部服务集成。

---

## 文件索引

### main.py
- **路径**: `backend/app/main.py`
- **职责**: FastAPI 应用入口，负责数据库迁移、种子数据、静态文件挂载、定时提醒
- **关键函数**：
  - `migrate_database()` (L17) — 启动时自动迁移数据库表结构（检查并添加缺失列）
  - `seed_database()` (L57) — 初始化种子数据（预设模式：学习模式、考试模式、休闲模式等）
  - `check_and_send_reminders()` (L148) — 定时检查提醒（当前为占位函数）
- **依赖**: `models.py`, `db.py`, 各 `api/*.py` 路由模块
- **被依赖**: Uvicorn 启动入口

---

### models.py
- **路径**: `backend/app/models.py`
- **职责**: SQLAlchemy ORM 模型定义，对应数据库表结构
- **关键类**：
  - `LifeMode` (L5) — 生活模式表（名称、显示名称、权重参数、图标等）
  - `StudyRecord` (L18) — 学习记录表（日期、时长、分类、标签）
  - `FinancialRecord` (L29) — 财务记录表（金额、类型、分类、来源）
  - `DailyMetric` (L41) — 每日指标表（学习时长、做题数、Rating、模式名）
  - `BrainMemory` (L54) — AI 记忆表（关键概念、内容、类型、重要度、使用次数）
  - `SystemSetting` (L65) — 系统设置表（AI 参数、洛谷 UID、当前模式等）
  - `ChatMessage` (L81) — 聊天消息表（角色、内容、时间戳）
  - `FutureEvent` (L90) — 未来事件表（名称、日期）
- **依赖**: `db.py`（Base 基类）
- **被依赖**: 所有 `api/*.py` 路由模块

---

### schemas.py
- **路径**: `backend/app/schemas.py`
- **职责**: Pydantic 数据校验模型，定义请求和响应格式
- **关键类**（按功能分组）：
  - **模式相关**: `LifeModeBase`(L6) / `LifeModeCreate`(L16) / `LifeModeUpdate`(L19) / `LifeModeResponse`(L28)
  - **学习记录**: `StudyRecordBase`(L35) / `StudyRecordCreate`(L43) / `StudyRecordResponse`(L46)
  - **财务记录**: `FinancialRecordBase`(L53) / `FinancialRecordCreate`(L61) / `FinancialRecordResponse`(L64)
  - **每日指标**: `DailyMetricBase`(L72) / `DailyMetricUpdate`(L82) / `DailyMetricResponse`(L90)
  - **AI 记忆**: `BrainMemoryBase`(L97) / `BrainMemoryCreate`(L102) / `BrainMemoryUpdate`(L105) / `BrainMemoryResponse`(L110)
  - **聊天**: `ChatRequest`(L120) / `ChatResponse`(L123) / `ChatMessageResponse`(L145) / `MessageUpdateRequest`(L155) / `MessageUpdateResponse`(L158)
  - **系统设置**: `SystemSettings`(L131)
  - **未来事件**: `FutureEventBase`(L163) / `FutureEventCreate`(L168) / `FutureEventResponse`(L171)
- **依赖**: 无
- **被依赖**: 所有 `api/*.py` 路由模块

---

### db.py
- **路径**: `backend/app/db.py`
- **职责**: 数据库连接管理，提供 Session 工厂和依赖注入
- **关键函数**：
  - `get_db()` (L21) — FastAPI 依赖注入：生成数据库会话，请求结束后自动关闭
- **依赖**: SQLAlchemy
- **被依赖**: 所有 `api/*.py` 路由模块

---

### luogu_scraper.py
- **路径**: `backend/app/services/luogu_scraper.py`
- **职责**: 洛谷数据爬虫，获取用户 Rating 和做题统计
- **关键函数**：
  - `scrape_luogu_user_profile()` (L11) — 爬取洛谷用户主页，提取 Rating、排名、各难度题目通过数
  - `scrape_luogu_solved()` (L103) — 爬取洛谷用户总通过题数
- **依赖**: `requests`、`BeautifulSoup`
- **被依赖**: `api/records.py`（`sync_luogu()` 调用）

---

## 模块间关系

```
main.py（应用入口）
  │
  ├─→ db.py（数据库连接）
  │     └─→ models.py（ORM 模型 = 数据库表）
  │
  ├─→ api/chat.py ──────┐
  ├─→ api/records.py ───┤── 都依赖 models.py + schemas.py + db.py
  ├─→ api/settings.py ──┤
  └─→ api/bills.py ─────┘
                          │
                          └─→ services/luogu_scraper.py（外部数据源）
```

## 已知问题与注意事项

- `models.py` 新增字段时，需要在 `main.py` 的 `migrate_database()` 中添加对应的迁移逻辑（手动 ALTER TABLE）
- `schemas.py` 中部分 Response 模型使用了 `orm_mode = True`（Pydantic v1 语法），如果升级 Pydantic v2 需要改为 `model_config`
- `db.py` 的数据库路径硬编码为 `backend/app/data/app.db`
- `luogu_scraper.py` 使用 HTTP 爬虫获取洛谷数据，依赖页面 HTML 结构，洛谷改版时可能失效
