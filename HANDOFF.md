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

### 🤖 A. 模型全面升级与时间幻觉修复
**文件**: `backend/app/main.py`, `backend/app/api/chat.py`, `backend/app/services/ai_agent.py`
- 将全局默认模型从 `deepseek-chat` 平滑升级到了更强大的 `deepseek-v4-flash`，并在系统初始化及自动升级脚本处完成强制迁移。
- 修复了 AI 在处理涉及日期的意图时的“幻觉”：通过向 System Prompt 头部注入精确至秒级的绝对服务器系统时间，建立了 1:1 现实时间锚定。

### 💬 B. 聊天组件滚动优化及体验重构
**文件**: `frontend/src/components/ChatPanel.jsx`
- 修复了因为原生 `scrollIntoView()` 强制引起整个浏览器页面视窗整体下拉的问题。现已由手动接管聊天容器本身的 `scrollTop = scrollHeight`，彻底断开与浏览器外部窗口的滚动联动，实现平滑内部局部滚动。
- 升级了交互细节，加入了动态小垃圾桶与编辑铅笔发光图标。

### 📝 C. 消息流管理（编辑重组与单条删除）
**文件**: `backend/app/api/chat.py`, `frontend/src/components/ChatPanel.jsx`, `backend/app/schemas.py`
- 新增 `DELETE /api/chat/messages/{message_id}` 接口：当删除用户发送的消息时，自动连带级联删除该提问所紧随其后的专属 AI 响应，保持“问答双删”的体验；如果仅删除 AI 回复则实现单删。
- 新增 `PUT /api/chat/messages/{message_id}` 接口：支持且仅支持编辑最近一次发出的用户对话。编辑保存后自动清理原有废弃回复，重载统计状态与聊天上下文进行全新大模型生成。前端已完整接入这一“悔牌重开”能力。

### 🧠 D. 记忆与上下文组装增强
**文件**: `backend/app/services/ai_agent.py`, `backend/app/api/records.py`
- **全量记忆注入**：依据用户反馈，撤除了原有仅载入前三条最相关碎片的限制，现在直接为 AI 注入脑海里的“全部有价值的心事与状态记录”。
- **详尽状态供给**：对数据接口的复用（重构提取 `get_time_range_stats`），在传入智脑时增加了“今日”与“本周”精确到各分类项（如阅读、代码刷题、运动）的分布清单。长周期维持使用精简模式避免喧宾夺主。
- **历史边界扩展与前缀标注**：对话溯源历史深度从 6 条增加至 **12** 条；此外，对最后一条最新的输入明确包裹了显眼的 `【主人的最新提问/指令】:` 标签并在 System prompt 中下达区分指令，防止在拼接过程中混淆。

### 🧪 E. 测试集扩充
**文件**: `backend/tests/test_main.py`
- 新编写 `test_chat_edit_delete` 用例。确保了“单条删除”、“级联删除”、“只能编辑最新消息”以及“编辑触发正确响应重建”后端功能的完备性。测试通过率维持 100%（9 / 9）。

---

## 🕰️ 3. 历史工作沉淀（前几个会话）

### 认知与模式配置 (Cognitive & Modes)
- **多维度时间切换**：在认知参数面板支持 总/年/月/周/日 五个维度的动态切换，学习/运动/洛谷/账本等数值跟随响应式同步。
- **静默自动同步**：页面加载完毕后静默调用 `handleSyncDataSilent()` 更新洛谷和其它指标面板。翻译词条大幅向简练专业修正（如将“同步洛谷”扩展修正为“同步数据”）。
- **内置与自定义生命模式融合**：在卡片组件中剥离多余的“模式”文字，点击任意模式（内置或自定义）均支持编辑大模型风格参数。

### 视觉体系 (Cyber Visuals)
- 全局采用 `cyber-cyan`, `cyber-blue`, `cyber-pink` 赛博霓虹配色，杜绝基础原子色。
- 微弱外发光（Neon Glow）+ 平缓呼吸动画体系（`cyber-glow-btn`, `cyber-border-glow`）。
- 最小字号 `text-[10px]`，保障可读性下限。

### 热力图与专注统计 (Heatmap & Timer)
- `backend/app/models.py` 新增 `FutureEvent` 模型，支持未来日程里程碑（高亮未来节点）。
- 洛谷刷题热力图：颜色由当日最高难度决定（0–7 级），悬浮展示细节。
- 多模式专注计时器：正向计秒、25/50 分钟番茄、自定义倒数。强制细分分类标签。
- 独立统计面板组件：日/周/月/年/总 切换，霓虹光轨进度条展示占比。

### 记忆面板与账本 (Memory & Ledger)
- “✨ 记忆中枢” 面板分离弹窗，支持全景审阅脑电波记忆卡片。卡片支持双向编辑修正与丢弃。
- 手动记录支出/收入，支持 CSV 导入（微信/支付宝格式智能解析）。

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
        └── test_main.py            # 自动化测试（9 个用例）
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
