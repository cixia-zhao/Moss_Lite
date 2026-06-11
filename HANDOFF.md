# 🌟 项目交接文档 (HANDOFF)

## 📌 1. 项目概览与环境
- **项目名称**: MOSS-Lite (赛博自律控制舱)
- **工作区路径**: `c:\Users\cixia\Desktop\xitong`
- **技术栈**: 
  - **前端**: React + Vite + TailwindCSS (位于 `frontend/` 目录)
  - **后端**: Python + FastAPI (位于 `backend/` 目录)
  - **数据库**: SQLite (通过 SQLAlchemy 管理模型映射)
- **运行方式**: 通过根目录的 `run.py` 脚本统一启动前后端，后端会代理托管前端构建后的静态文件。该脚本已做优化，若检测到 `node_modules` 已存在，会自动跳过依赖安装以加速启动。
- **构建与部署流程**: 
  - 前端开发：`cd frontend && npm run dev`
  - 前端构建与同步：`cd frontend && npm run build`，然后将 `frontend/dist` 的内容复制到 `backend/static` 中（`run.py` 中有相关打包逻辑支持）。

## 🚀 2. 本次会话已完成的工作 (Latest Upgrades)

### 🎨 A. 核心视觉与名称统调
- 全局统一剥离冗长的“赛博自律飞船控制舱”等字样，全系统极简命名为 **MOSS-Lite**。
- 延续并深化微弱霓虹外发光 (Neon Glow) 与平缓呼吸动画 (Pulse)，移除了以往低幼的基础红绿蓝纯色，大幅调优透明度和科技赛博质感 (`cyber-cyan`, `cyber-blue`, `cyber-pink` 等变体)。
- 彻底清理了全局小于 10px 的微小字体，最小字号限制提升并统一替换为 `text-[10px]` 乃至 `text-xs`，规避可读性灾难。

### 🔮 B. “时空预测”热力图 (Heatmap)
- 彻底修复由于定死高度（如 `h-[116px]`）造成的星期指示文本（如周二、周日）错位不对齐的 Bug，改为动态 Flex 高度自适应。
- **未来网格动态延伸**：在 `models.py` 中新增 `FutureEvent` 模型，API 层 (`records.py`) 根据未来最远的一件日程动态向后延伸热力格子。不再局限于过去的打卡，热力图正式走向时间轴未来。
- **未来日程弹窗**：在面板左上方新增 `[+ 未来日程]` 交互，支持手动设定未来里程碑（如考试、答辩）。设定后，该未来的热力格将亮起特制的琥珀色科幻警示光。
- **精准全息倒计时**：悬浮 (Tooltip) 未来网格时，自动解析计算天数差，并呈现悬浮倒计时卡片。

### 🍅 C. 专注引擎重构 (Focus Timer)
- 彻底推翻原单一计时逻辑，引入 **MOSS FOCUS 模式切换**：不仅支持正向计秒，现已支持 **🍅25分钟番茄**、**🍅50分钟深度番茄**，以及**自定义倒数模式**。
- 引入强制打标分类机制。在启动前或结束保存时，需选定或自定义当前专注的类目（学习、健身、阅读、编程等），将精准时长提交至后端接口以供统计。

### 📊 D. 高级多维度数据大盘 (Statistics Panel)
- 后端重构 `/records/stats`，计算下发 **日、周、月、年、总计** 五大时间跨度的高级分类统计 (`advanced_stats`)。
- 前端新增 `StatisticsPanel.jsx` 组件，部署于热力图侧方/下方区域。
- 采用霓虹光轨条纹（进度条）形式，直观铺排各个标签在不同周期内的累计总时间以及占比。

## 📂 3. 核心文件地图 (Code Map)
- **后端模型与逻辑**: 
  - `backend/app/models.py` (数据表基石，含新增的 `FutureEvent`)
  - `backend/app/api/records.py` (数据路由中枢，含修改版的热力逻辑和高级汇总逻辑)
- **核心前端组件** (`frontend/src/components/`):
  - `Heatmap.jsx` (融合未来预测、Tooltip与日程添加Modal)
  - `FocusTimer.jsx` (包含多模式番茄钟、自定义标签选取逻辑)
  - `StatisticsPanel.jsx` (最新引入的多周期聚合统计仪表)
  - `Ledger.jsx`, `ChatPanel.jsx`, `Settings.jsx`
- **样式与主干**:
  - `frontend/src/index.css` (存放了核心光影渲染变量和关键帧)
  - `frontend/src/App.jsx` (网格布局控制核心，注意 Heatmap 与 StatisticsPanel 的协同排版)
- **启动层**:
  - `run.py` (环境引导)

## ⏳ 4. 当前进度与精准的 Next Steps
1. **排版细节微调**: 由于大幅修改了主界面的响应式栅格 (grid-cols)，在特定的屏幕尺寸缩放时，Statistics Panel 和 FocusTimer 的挤压形变需要多加关注测试。
2. **日程的 CRUD 闭环**: 未来日程目前支持在热力图新增查看，但缺乏修改、作废等面板逻辑，可以在 Settings 或者新弹窗中增加里程碑管理页面。
3. **智脑情感挂接**: 既然计时的种类变丰富了，下一步可以在不同类别（如健身 vs 阅读）触发 MOSS 的不同语气点评和不同的全息波形状态。

## ⚠️ 5. 不可触碰的红线 (DO NOTs - 给下一位 AI 的警告)

- **🚫 DO NOT 违背交互规划守则**：遇到存在架构分歧或需要确认设计的 `Open Questions`，严禁擅自写进 `implementation_plan.md` 强制用户过审！必须先使用 `ask_question` 工具抛出选项或用纯文本给用户自定义选择。得到答复后，再形成无争议的计划文档！
- **🚫 DO NOT 破坏赛博视觉体系**：切勿为了省事而回退到普通的 tailwind 原子色 (如 bg-red-500、bg-blue-400)，必须使用我们调校好的变体并叠加 `cyber-glow` 等光效体系。保持应用高级、灵动的质感。
- **🚫 DO NOT 缩小字体可读性界限**：极小字体已全面取缔。不要在任何新组件中重新使用小于 `text-[10px]` 的微型字体。
- **🚫 DO NOT 遗忘全量构建环境**：前端界面的所有改动，若不执行 `npm run build` 并将新打包的静态资源挪给 FastAPI 服务，在 `http://localhost:8000` 是看不见效果的！必须闭环验证流程。
- **务必重视**: 在每个对话会话开始时，严格调用 `view_file(IsSkillFile=true)` 执行系统内的 6 个 `.gemini\antigravity-ide\skills` 核心技能文档体系，确保开发思维无断层。
