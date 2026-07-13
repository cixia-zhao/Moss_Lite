# 前端组件速查文档

> 最后更新：2026-06-13
> 覆盖文件：`frontend/src/App.jsx` 及 `frontend/src/components/` 下全部 7 个组件

## 模块职责

MOSS-Lite 前端采用 React + Vite 构建，实现赛博风格的个人效率管理界面。包含聊天面板、专注计时器、热力图、统计面板、账本、设置中心和全息核心动画。

---

## 文件索引

### App.jsx
- **路径**: `frontend/src/App.jsx`
- **职责**: 应用根组件，管理全局状态和数据获取，组装各子组件
- **关键函数**：
  - `App()` (L16) — 根组件，管理 settings/modes/heatmap/finance/stats 等全局状态
  - `fetchDashboardData()` (L74) — 从后端拉取所有面板数据（设置、模式、财务、热力图、统计），应用启动和刷新时调用
  - `handleSyncLuogu()` (L120) — 手动触发洛谷数据同步，显示同步状态
  - `handleSyncDataSilent()` (L47) — 静默同步洛谷数据，首次加载时自动执行
- **依赖**: 所有 `components/` 下的子组件、`LanguageContext`
- **被依赖**: `main.jsx`（入口挂载点）

---

### ChatPanel.jsx
- **路径**: `frontend/src/components/ChatPanel.jsx`
- **职责**: AI 聊天面板，管理消息收发、历史记录、记忆系统
- **关键函数**：
  - `ChatPanel({ onStateChange, apiUrl })` (L5) — 组件入口
  - `handleSend()` (L219) — 发送用户消息到 `/api/chat`，接收 AI 回复并更新消息列表
  - `handleDeleteMessage()` (L135) — 删除单条消息，用户消息触发级联删除关联 AI 回复
  - `handleSaveEditedMessage()` (L160) — 编辑已有消息内容，调用 `PUT /api/chat/messages/{id}`
  - `handleClearHistory()` (L188) — 清空全部聊天历史（带确认弹窗）
  - `fetchChatHistory()` (L51) — 获取聊天历史记录
  - `fetchMemories()` (L73) — 获取 AI 记忆列表
  - `handleWipeMemory()` (L94) — 删除指定记忆（带确认弹窗）
  - `handleSaveMemory()` (L118) — 编辑保存记忆内容
- **依赖**: 后端 `/api/chat/*` 系列接口
- **被依赖**: `App.jsx`

---

### FocusTimer.jsx
- **路径**: `frontend/src/components/FocusTimer.jsx`
- **职责**: 专注计时器，支持计时/手动记录、自定义预设和标签
- **关键函数**：
  - `FocusTimer({ onStateChange, onRecordAdded, apiUrl })` (L5) — 组件入口
  - `saveTimerRecord()` (L160) — 计时结束后自动保存学习记录到 `/api/records/study`
  - `handleManualSubmit()` (L204) — 手动输入学习时长并提交
  - `handleStartPause()` (L146) — 开始/暂停计时
  - `handleStop()` (L148) — 停止计时并保存记录
  - `handleSaveCustomPreset()` (L38) — 保存自定义时长预设
  - `handleSaveCustomTag()` (L53) — 保存自定义分类标签
  - `formatTime()` (L135) — 秒数格式化为 mm:ss 显示
  - `handleMonthBlur()` (L110) — 补登日期月份失焦自动补零
  - `handleDayBlur()` (L128) — 补登日期日失焦自动补零
- **依赖**: 后端 `/api/records/study`
- **被依赖**: `App.jsx`

---

### Heatmap.jsx
- **路径**: `frontend/src/components/Heatmap.jsx`
- **职责**: 学习热力图 + 洛谷竞赛数据展示 + 未来事件管理
- **关键函数**：
  - `Heatmap({ data, onRefresh, apiUrl })` (L5) — 组件入口
  - `handleCreateEvent()` (L21) — 创建未来事件到 `/api/records/future_events`
  - `getColorClass()` (L49) — 根据学习时长返回热力图色阶
  - `renderGridCells()` (L110) — 渲染热力图网格单元格
  - `renderMonthLabels()` (L136) — 渲染月份标签
  - `renderDifficultyStats()` (L168) — 渲染洛谷题目难度分布统计
  - `getRatingDesc()` (L193) — 洛谷 Rating 等级描述
  - `getDaysDiff()` (L201) — 计算未来事件倒计时天数
  - `handleMonthBlur()` (L75) — 月份输入框失焦自动补零
  - `handleDayBlur()` (L93) — 日期输入框失焦自动补零
- **依赖**: `data` 从 `App.jsx` 传入（来自 `/api/records/heatmap`）
- **被依赖**: `App.jsx`

---

### StatisticsPanel.jsx
- **路径**: `frontend/src/components/StatisticsPanel.jsx`
- **职责**: 统计面板，展示各分类学习时长和纯展示信息
- **关键函数**：
  - `StatisticsPanel({ stats })` (L5) — 组件入口
  - `getTotalDuration()` (L18) — 计算总学习时长
  - `getCategoryIcon()` (L22) — 返回分类图标 emoji
  - `getCategoryName()` (L30) — 返回分类中文名
  - `formatDuration()` (L38) — 分钟数格式化为小时分钟显示
- **依赖**: `stats` 从 `App.jsx` 传入（来自 `/api/records/stats`）
- **被依赖**: `App.jsx`

---

### Ledger.jsx
- **路径**: `frontend/src/components/Ledger.jsx`
- **职责**: 收支账本，支持手动添加和导入账单文件
- **关键函数**：
  - `Ledger({ records, onRecordAdded, apiUrl })` (L5) — 组件入口
  - `handleSubmit()` (L29) — 提交新收支记录到 `/api/records/finance`
  - `handleFileUpload()` (L66) — 上传账单文件（支付宝/微信），调用 `/api/bills/upload`
  - `handleDelete()` (L105) — 删除收支记录
  - `handleMonthBlur()` (L61) — 记账日期月份失焦自动补零
  - `handleDayBlur()` (L79) — 记账日期日失焦自动补零
- **依赖**: 后端 `/api/records/finance` 和 `/api/bills/upload`
- **被依赖**: `App.jsx`

---

### Settings.jsx
- **路径**: `frontend/src/components/Settings.jsx`
- **职责**: 系统设置面板，管理 AI 参数、模式的增删改
- **关键函数**：
  - `Settings({ settings, modes, onSettingsUpdated, apiUrl })` (L5) — 组件入口
  - `handleSaveSettings()` (L51) — 保存系统设置到 `/api/settings`
  - `handleEditMode()` (L87) — 进入模式编辑状态
  - `handleSubmitMode()` (L103) — 提交新建/编辑模式到 `/api/modes`
  - `handleDeleteMode()` (L156) — 弹出删除确认
  - `confirmDeleteMode()` (L161) — 确认删除模式
- **依赖**: 后端 `/api/settings` 和 `/api/modes`
- **被依赖**: `App.jsx`

---

### HologramCore.jsx
- **路径**: `frontend/src/components/HologramCore.jsx`
- **职责**: 全息核心动画组件，根据计时器状态改变视觉效果
- **关键函数**：
  - `HologramCore({ state = "calm" })` (L3) — 组件入口，`state` 控制动画状态
  - `draw()` (L34) — Canvas 绘制逻辑，渲染旋转几何图形
- **依赖**: 无外部依赖
- **被依赖**: `App.jsx`

---

## 模块间关系

```
App.jsx（根组件 — 全局状态管理和数据获取）
  │
  ├─→ ChatPanel     → /api/chat/*（独立管理消息和记忆）
  ├─→ FocusTimer    → /api/records/study（计时→创建记录）
  ├─→ Heatmap       ← data 从 App 传入（纯展示 + 创建事件）
  ├─→ StatisticsPanel ← stats 从 App 传入（纯展示）
  ├─→ Ledger        → /api/records/finance, /api/bills/upload
  ├─→ Settings      → /api/settings, /api/modes
  └─→ HologramCore  ← state 从 App 传入（纯动画）
```

## 已知问题与注意事项

- ChatPanel 的消息删除是**级联删除**：删用户消息时会自动删其后的 AI 回复
- FocusTimer 的计时数据在组件卸载时不会自动保存（需手动停止）
- Heatmap 的色阶通过 `getColorClass()` 硬编码，修改需同步更新 CSS
