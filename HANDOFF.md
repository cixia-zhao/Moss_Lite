# 🌟 项目交接文档 (HANDOFF)

> 最后更新：2026-06-12

## 📌 1. 项目概览与环境
- **项目名称**: Link
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

## 🚀 2. 本次会话已完成的工作 (Latest Session Upgrades — 2026-06-13)

### 📅 A. 未来日程 CRUD 闭环与联动日期输入框
**文件**: `backend/app/api/records.py`, `backend/tests/test_main.py`, `frontend/src/components/Heatmap.jsx`
- **后端新增修改接口**：增设 `PUT /api/records/future_events/{event_id}` 接口，实现未来日程里程碑编辑。
- **自定义日期选择组件**：前端移除表现有缺陷的原生 `<input type="date" />` 控件，开发了全新的年（maxLength=4）/ 月 / 日三框联动输入组合，支持输入满位自动跳转与数值区间保护。
- **未来日程管理舱**：支持在 Modal 中完整展示、新建、修改和删除所有里程碑，并与热力图上的未来格子联动（点击直接呼出并预填该日期）。
- **单元测试**：新增 `test_future_event_crud_endpoints` 用例，自动化测试全数绿灯（10/10）。

---

## 🕰️ 3. 历史工作沉淀（前几个会话）

### 模型与聊天交互 (AI Models & Chat)
- 将全局模型迁移至 `deepseek-v4-flash`。
- 系统提示词头部注入秒级服务器绝对时间，解决时间幻觉问题。
- 重构聊天面板滚动逻辑，由 `scrollTop` 接管局部容器内部平滑滚动，并支持消息最近一条编辑与问答级联双删。
- 对话历史深度增至 12 条，优化记忆检索算法并为 AI 注入全量有价值心事记忆。

### 认知与计时面板 (Cognitive Panel & Focus Timer)
- 洛谷刷题热力图：颜色由当日最高难度决定（0–7 级），悬浮展示细节。
- 系统设置支持多维度自律时间切换（总/年/月/周/日），支持静默自动同步指标。
- 支持正向与倒数多种专注计时模式，新增未来里程碑 FutureEvent 模型支持。
- 手动记录支出/收入账本，支持微信与支付宝 CSV 账单解析导入。

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
        └── test_main.py            # 自动化测试（10 个用例）
```

---

## ⏳ 5. 当前进度与 Next Steps（下次会话优先级）

1. **洛谷热力图历史数据验证**：同步后，热力图是否能正常展示几个月前的历史过题记录，需实际数据环境下验证颜色渐变效果。
2. **补登日期与热力图联动 Bug**：已知补登学习记录时，若标签含"代码刷题"，当天热力图的"学习时间"页也会叠加——需在热力图数据聚合逻辑中进一步校验分类过滤。
3. **StatisticsPanel 与 FocusTimer 响应式挤压**：在 1024px 左右屏宽时两者并列可能出现压缩，可考虑折叠或堆叠布局优化。

---

## ⚠️ 6. 不可触碰的红线 (DO NOTs — 给下一位 AI 的警告)

- **🚫 DO NOT 违背交互规划守则**：遇到存在架构分歧或需要确认设计的 `Open Questions`，严禁擅自写进 `implementation_plan.md` 强制用户过审！必须先使用 `ask_question` 工具或纯文本给用户选择，得到答复后再形成无争议的计划文档！
- **🚫 DO NOT 破坏赛博视觉体系**：切勿为省事回退到普通的 Tailwind 原子色（如 `bg-red-500`、`bg-blue-400`），必须使用已调校好的变体并叠加 `cyber-glow` 等光效体系，保持高级灵动质感。
- **🚫 DO NOT 缩小字体可读性界限**：极小字体已全面取缔，不要在任何新组件中使用小于 `text-[10px]` 的微型字体。
- **🚫 DO NOT 混淆静态资源同步托管目录**：前端构建产物构建后必须同步到 `backend/static` 托管目录（非 `backend/app/static`），否则在浏览器中无法实时生效更新。
- **🚫 DO NOT 对未来日程等关键输入使用原生的 `<input type="date" />` 控件**：原生控件允许输入超过4位年份，容易导致交互和测试崩溃。必须统一使用新研发的年/月/日三文本框联动跳转输入框组合。
- **🚫 DO NOT 在支出/收入旁加括号和英文**：中文模式下，账本标签与认知参数舱的展示文字，不允许出现`（Expense）`等中英混合格式。
- **🚫 DO NOT 把"模式"两字保留在模式卡片和下拉选项的显示名中**：已通过正则过滤，若新建模式时 `display_name` 带"模式"后缀，前端会自动剥离，保持 UI 一致性。
- **务必重视**：在每个对话会话开始时，严格调用 `view_file(IsSkillFile=true)` 执行系统内的 6 个核心技能（planning-with-files、brainstorming、systematic-debugging、test-driven-development、verification-before-completion、workflow-by-cixia），确保开发思维无断层。

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
