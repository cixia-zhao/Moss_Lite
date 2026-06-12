# 🌟 项目交接文档 (HANDOFF)

> 最后更新：2026-06-12

## 📌 1. 项目概览与环境
- **项目名称**: MOSS-Lite / Link 控制舱
- **工作区路径**: `c:\Users\cixia\Desktop\xitong`
- **技术栈**:
  - **前端**: React + Vite + TailwindCSS（位于 `frontend/` 目录）
  - **后端**: Python + FastAPI（位于 `backend/` 目录）
  - **数据库**: SQLite（通过 SQLAlchemy 管理模型映射）
- **运行方式**: 通过根目录的 `run.py` 脚本统一启动前后端，后端代理托管前端构建产物。检测到 `node_modules` 存在时，自动跳过依赖安装以加速启动。
- **构建与部署流程**:
  - 前端开发：`cd frontend && npm run dev`
  - 前端构建并同步到后端：`cd frontend && npm run build`，再将 `frontend/dist` 复制至 `backend/app/static`。
  - 完整一步同步：`cd frontend && npm run build && cd .. && cp -r frontend/dist backend/app/static`（Windows 用 PowerShell `Copy-Item`）

---

## 🚀 2. 本次会话已完成的工作 (Latest Session Upgrades — 2026-06-12)

### 🔢 A. 认知参数舱 — 多维度时间切换
**文件**: `frontend/src/App.jsx`

- 在「认知参数」面板顶部新增了 **总 / 年 / 月 / 周 / 日** 五个时间维度切换按钮（默认为「总」）。
- 切换后，学习累计、运动量、洛谷通过、收支数据会同步对应时间范围的实际数值，而不是固定的 30 天。
- 数据来源从 `stats.time_range_stats[cognitiveTimeRange]` 动态读取，兼容旧版 30 天字段。

### 🔄 B. 页面加载自动同步 & 同步按钮更名
**文件**: `frontend/src/App.jsx`

- 原「同步洛谷」按钮改名为 **「同步数据」**（语义扩展，不单局限于洛谷）。
- 页面首次加载完毕后，若已配置洛谷 UID，会在 200ms 后自动调用一次 `handleSyncDataSilent()`（静默同步），无需手动点击，通过 `autoSyncedRef` 防止重复触发。

### 🏷️ C. 界面文案精简（翻译词条修正）
**文件**: `frontend/src/contexts/LanguageContext.jsx`

已修正以下翻译词条：

| Key | 旧值 | 新值 |
|---|---|---|
| `settings.title` | 系统控制台设置 | 系统设置 |
| `settings.lifeMode` | 生命阶段周期模式 | 模式/状态 |
| `settings.currentPeriod` | 当前生命周期模式 | 当前模式/状态 |
| `settings.registry` | 生命模式注册表 | 模式列表 |
| `settings.solved` | 洛谷累计总通过 | 已计洛谷累计数 |
| `app.cognitive` | 核心属性参数 | 认知参数 |
| `app.syncLuogu` | 同步洛谷 | 同步数据 |
| `ledger.expense` | 支出 (Expense) | 支出 |
| `ledger.income` | 收入 (Income) | 收入 |
| `settings.push` | Push Channel | 推送通道 |

### ⚙️ D. 生命模式管理重构
**文件**: `frontend/src/components/Settings.jsx`

- **模式列表标题旁新增 `+` 号按钮**，取代原先独立的"创建自定义模式"按钮，视觉更紧凑。
- **模式卡片全面去掉"模式"两字后缀**（通过正则 `replace(/模式$/, '').replace(/\s*Mode$/i, '')` 过滤），展示更简洁。
- **所有模式卡片（包含内置系统模式）均支持点击编辑**：点击任意卡片将弹出编辑模态框，可自定义名称、备注、学习/运动/洛谷目标、AI 语气提示词。对内置模式使用 `PUT /api/modes/{id}` 更新，不允许修改英文 ID。
- 弹出框标题：新建时显示「创建新生命模式」，编辑时显示「编辑生命状态」。

### 📊 E. 后端统计接口扩展
**文件**: `backend/app/api/records.py`

- `GET /api/records/stats` 新增 `time_range_stats` 字段，包含 `total/yearly/monthly/weekly/daily` 五个维度的：
  - `study_minutes`（学习时长，分钟）
  - `exercise_minutes`（运动时长，分钟）
  - `luogu_solved`（洛谷过题数；`total` 维度取 `luogu_total_solved` 系统设置字段）
  - `expense`（支出金额，元）
  - `income`（收入金额，元）

### 🧪 F. 自动化测试（TDD 全覆盖）
**文件**: `backend/tests/test_main.py`

- 新增 `test_stats_endpoint_with_time_ranges` 测试用例，验证各时间维度数据正确性。
- **测试结果：8/8 全部通过**，含原有 7 条用例和新增 1 条。

---

## 🕰️ 3. 历史工作沉淀（前几个会话）

### 视觉体系
- 全局采用 `cyber-cyan`, `cyber-blue`, `cyber-pink` 赛博霓虹配色，杜绝基础原子色。
- 微弱外发光（Neon Glow）+ 平缓呼吸动画体系（`cyber-glow-btn`, `cyber-border-glow`）。
- 最小字号 `text-[10px]`，保障可读性下限。

### 热力图（Heatmap）
- `backend/app/models.py` 新增 `FutureEvent` 模型，支持未来日程里程碑。
- 热力格根据最远未来事件日期动态延伸，琥珀色高亮未来预约节点。
- 洛谷刷题热力图：颜色由当日最高难度决定（0–7 级），悬浮 Tooltip 显示日期、过题数、专注时长，底部显示月份，难度总统计显示在面板右侧。
- 其他子页（学习/运动）热力图悬浮 Tooltip 只显示日期 + 对应时长（去除冗余字段）。

### 专注计时器（FocusTimer）
- 多模式：正向计秒、25/50 分钟番茄、自定义倒数。
- 强制分类标签：每次记录必须选定类目（学习、代码刷题、健身、阅读、自定义）。
- 自定义倒数分钟数输入框旁有独立保存按钮，支持保存后立即计时。

### 统计面板（StatisticsPanel）
- 独立组件 `frontend/src/components/StatisticsPanel.jsx`。
- 日/周/月/年/总 切换，霓虹光轨进度条展示各标签时长占比。
- 累计数据（总时间字段）为只读，不可自定义。

### AI 对话记忆（ChatPanel）
- 对接 DeepSeek API，记忆核心持久化存储，支持按条删除记忆。
- 语气由当前生命模式的 `ai_system_prompt` 字段驱动。

### 账本（Ledger）
- 手动记录支出/收入，CSV 导入（微信/支付宝格式智能解析）。
- 中文环境下，支出/收入标签不含括号及英文。

---

## 📂 4. 核心文件地图 (Code Map)

```
xitong/
├── run.py                          # 统一启动脚本（含前端构建与 FastAPI 启动）
├── HANDOFF.md                      # ← 本文件，AI 交接用
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # 主布局、认知参数舱、自动同步逻辑
│   │   ├── index.css               # 全局赛博光影变量与关键帧
│   │   ├── contexts/
│   │   │   └── LanguageContext.jsx # 中英文翻译词条
│   │   └── components/
│   │       ├── Heatmap.jsx         # 认知热力图（含洛谷/学习/运动/综合子页）
│   │       ├── FocusTimer.jsx      # 多模式专注计时器
│   │       ├── StatisticsPanel.jsx # 多维度高级统计面板
│   │       ├── Settings.jsx        # 系统设置 + 模式管理
│   │       ├── Ledger.jsx          # 收支账本
│   │       └── ChatPanel.jsx       # AI 对话与记忆核心
│   └── dist/                       # 构建产物（已同步至 backend/app/static）
└── backend/
    ├── app/
    │   ├── main.py                 # FastAPI 入口
    │   ├── models.py               # 数据模型（含 FutureEvent, DailyMetric）
    │   ├── schemas.py              # Pydantic 校验 Schema
    │   ├── db.py                   # SQLAlchemy 数据库连接
    │   ├── api/
    │   │   ├── records.py          # 学习/运动/热力图/洛谷/统计 路由
    │   │   ├── settings.py         # 系统设置/模式 CRUD 路由
    │   │   ├── chat.py             # AI 对话 & 记忆路由
    │   │   └── finance.py          # 财务账单 CSV 解析路由
    │   └── services/
    │       └── luogu_scraper.py    # 洛谷用户数据抓取服务
    └── tests/
        └── test_main.py            # 自动化测试（8 个用例）
```

---

## ⏳ 5. 当前进度与 Next Steps（下次会话优先级）

1. **洛谷热力图历史数据验证**：同步后，热力图是否能正常展示几个月前的历史过题记录，需实际数据环境下验证颜色渐变效果。
2. **补登日期与热力图联动 Bug**：已知补登学习记录时，若标签含"代码刷题"，当天热力图的"学习时间"页也会叠加——需在热力图数据聚合逻辑中进一步校验分类过滤。
3. **未来日程 CRUD 闭环**：目前支持新增和查看里程碑，缺少编辑/删除的面板入口，可在 Settings 或热力图 Tooltip 中补全。
4. **StatisticsPanel 与 FocusTimer 响应式挤压**：在 1024px 左右屏宽时两者并列可能出现压缩，可考虑折叠或堆叠布局优化。

---

## ⚠️ 6. 不可触碰的红线 (DO NOTs — 给下一位 AI 的警告)

- **🚫 DO NOT 违背交互规划守则**：遇到存在架构分歧或需要确认设计的 `Open Questions`，严禁擅自写进 `implementation_plan.md` 强制用户过审！必须先使用 `ask_question` 工具或纯文本给用户选择，得到答复后再形成无争议的计划文档！
- **🚫 DO NOT 破坏赛博视觉体系**：切勿为省事回退到普通的 Tailwind 原子色（如 `bg-red-500`、`bg-blue-400`），必须使用已调校好的变体并叠加 `cyber-glow` 等光效体系，保持高级灵动质感。
- **🚫 DO NOT 缩小字体可读性界限**：极小字体已全面取缔，不要在任何新组件中使用小于 `text-[10px]` 的微型字体。
- **🚫 DO NOT 遗忘全量构建环节**：前端所有改动，若不执行 `npm run build` 并将产物复制至 `backend/app/static`，在 `http://localhost:8000` 是看不到效果的！必须闭环验证。
- **🚫 DO NOT 在支出/收入旁加括号和英文**：中文模式下，账本标签与认知参数舱的展示文字，不允许出现`（Expense）`等中英混合格式。
- **🚫 DO NOT 把"模式"两字保留在模式卡片和下拉选项的显示名中**：已通过正则过滤，若新建模式时 `display_name` 带"模式"后缀，前端会自动剥离，保持 UI 一致性。
- **务必重视**：在每个对话会话开始时，严格调用 `view_file(IsSkillFile=true)` 执行系统内的 6 个 `.gemini\antigravity-ide\skills` 核心技能文档体系，确保开发思维无断层。

---

## 🔑 7. 关键配置与外部依赖

| 配置项 | 说明 |
|---|---|
| 洛谷 UID | 在系统设置页填写，用于触发洛谷数据抓取 |
| DeepSeek API Key | 本地 SQLite 存储，用于 Link AI 对话功能 |
| Bark Device Key | iOS 手机推送（选填） |
| PushDeer PushKey | 微信推送（选填） |
| 推送时间 | 默认 22:00，每日一次自律报告推送 |

> 所有配置均通过「系统设置」页面 UI 操作，存入本地 `backend/data/moss.db` SQLite 文件，不会上传至任何云端。
