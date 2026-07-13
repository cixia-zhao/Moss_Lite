# 后端接口速查文档

> 最后更新：2026-06-13
> 覆盖文件：`backend/app/api/` 下全部 4 个路由文件

## 模块职责

MOSS-Lite 后端采用 FastAPI 构建，提供 REST API 接口。路由按功能域拆分为聊天、记录、设置、账单四个模块。

---

## 文件索引

### chat.py
- **路径**: `backend/app/api/chat.py`
- **职责**: AI 聊天接口，管理消息收发、记忆系统、上下文编译
- **关键函数**：
  - `post_chat_message()` (L94) — `POST /api/chat` — 核心接口：接收用户消息，编译上下文（设置+记忆+历史），调用 AI API，返回回复。同时后台异步提取记忆
  - `compile_ai_context_stats()` (L23) — 编译 AI 上下文：收集设置、今日指标、学习统计、财务数据，拼装为系统提示词
  - `run_memory_extraction_task()` (L15) — 后台任务：从对话中提取关键记忆并存入数据库
  - `get_chat_history()` (L167) — `GET /api/chat/history` — 获取全部聊天历史
  - `clear_chat_history()` (L172) — `DELETE /api/chat/history` — 清空全部聊天记录
  - `get_memories()` (L179) — `GET /api/chat/memories` — 获取全部 AI 记忆
  - `delete_memory()` (L184) — `DELETE /api/chat/memories/{id}` — 删除指定记忆
  - `update_memory()` (L194) — `PUT /api/chat/memories/{id}` — 编辑记忆内容
  - `delete_chat_message()` (L213) — `DELETE /api/chat/messages/{id}` — 删除消息（用户消息级联删后续 AI 回复）
  - `edit_chat_message()` (L230) — `PUT /api/chat/messages/{id}` — 编辑消息内容
- **依赖**: `models.py`, `schemas.py`, `db.py`, OpenAI API
- **被依赖**: `ChatPanel.jsx`

---

### records.py
- **路径**: `backend/app/api/records.py`
- **职责**: 学习记录、财务记录、每日指标、热力图、统计、未来事件、洛谷同步
- **关键函数**：
  - `get_study_records()` (L21) — `GET /api/records/study` — 获取学习记录列表（支持日期过滤）
  - `create_study_record()` (L34) — `POST /api/records/study` — 创建学习记录，自动触发每日 Rating 重算
  - `get_financial_records()` (L51) — `GET /api/records/finance` — 获取财务记录列表
  - `create_financial_record()` (L64) — `POST /api/records/finance` — 创建财务记录
  - `delete_financial_record()` (L79) — `DELETE /api/records/finance/{id}` — 删除财务记录
  - `get_daily_metric()` (L93) — `GET /api/records/daily/{date}` — 获取指定日期的每日指标
  - `update_daily_metric()` (L104) — `PUT /api/records/daily/{date}` — 更新每日指标
  - `get_time_range_stats()` (L131) — 内部函数：按时间范围（今日/本周/本月/总计）统计学习时长
  - `get_stats()` (L191) — `GET /api/records/stats` — 获取完整统计数据
  - `get_heatmap_data()` (L249) — `GET /api/records/heatmap` — 获取热力图数据（含洛谷 Rating、题目难度分布）
  - `get_future_events()` (L355) — `GET /api/records/future_events` — 获取未来事件列表
  - `create_future_event()` (L359) — `POST /api/records/future_events` — 创建未来事件
  - `delete_future_event()` (L367) — `DELETE /api/records/future_events/{id}` — 删除未来事件
  - `_recalculate_rating_for_metric()` (L379) — 内部函数：根据当日模式的权重参数重算 Rating
  - `recalculate_daily_rating()` (L420) — 内部函数：获取当前模式并调用重算逻辑
  - `fill_historical_metrics()` (L434) — 内部函数：批量补填历史每日指标
  - `sync_luogu()` (L468) — `POST /api/records/luogu/sync` — 同步洛谷数据
- **依赖**: `models.py`, `schemas.py`, `db.py`, `luogu_scraper.py`
- **被依赖**: `App.jsx`, `FocusTimer.jsx`, `Heatmap.jsx`

---

### settings.py
- **路径**: `backend/app/api/settings.py`
- **职责**: 系统设置和模式的增删改查
- **关键函数**：
  - `get_or_create_settings()` (L11) — 内部函数：获取或创建默认设置
  - `get_settings()` (L21) — `GET /api/settings` — 获取系统设置
  - `update_settings()` (L25) — `PUT /api/settings` — 更新系统设置（含 AI 参数）
  - `get_modes()` (L46) — `GET /api/modes` — 获取所有模式列表
  - `create_mode()` (L50) — `POST /api/modes` — 创建新模式
  - `update_mode()` (L63) — `PUT /api/modes/{id}` — 更新模式参数
  - `delete_mode()` (L78) — `DELETE /api/modes/{id}` — 删除模式（保护预设模式不可删）
- **依赖**: `models.py`, `schemas.py`, `db.py`
- **被依赖**: `Settings.jsx`, `App.jsx`

---

### bills.py
- **路径**: `backend/app/api/bills.py`
- **职责**: 账单文件导入（支持支付宝/微信 CSV）
- **关键函数**：
  - `upload_bill_file()` (L13) — `POST /api/bills/upload` — 解析上传的 CSV 文件，批量导入财务记录
- **依赖**: `models.py`, `db.py`
- **被依赖**: `Ledger.jsx`

---

## 模块间关系

```
前端组件
  │
  ├─ ChatPanel.jsx  → chat.py    → OpenAI API（AI 对话）
  ├─ FocusTimer.jsx → records.py → models.py（学习记录）
  ├─ App.jsx        → records.py → luogu_scraper.py（洛谷同步）
  ├─ App.jsx        → settings.py（设置和模式）
  ├─ Ledger.jsx     → records.py + bills.py（财务记录）
  └─ Heatmap.jsx    → records.py（热力图 + 未来事件）
```

## 已知问题与注意事项

- `chat.py` 的 `compile_ai_context_stats()` 会拼接大量上下文（设置+记忆+当日指标+统计），可能影响 AI token 开销
- `records.py` 的 `sync_luogu()` 依赖爬虫，洛谷反爬策略变更时可能需要更新 `luogu_scraper.py`
- `bills.py` 的 CSV 解析是硬编码格式，只支持支付宝和微信的特定导出格式
