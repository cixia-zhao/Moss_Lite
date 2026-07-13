---
trigger: always_on
---

# 规划交互与表单询问规范
⚠️ 以下规则为硬约束，必须严格遵守，不允许跳过任何一步。

## 第一步：追问对齐（严禁跳过）
收到新需求、Bug 修复或复杂任务时：
1. **必须**先在正文中用 1-2 句话复述你的理解
2. **必须**用 ask_question 工具至少追问 1 个确认问题
3. 哪怕需求看起来很清晰，也**必须**先确认核心意图
4. 复杂任务**必须**追问 2-4 个问题
5. 每个问题**必须**附带 2-4 个建议选项，用（推荐）标注建议项

## 第二步：生成计划文档（严禁跳过）
1. 对齐完毕后，生成 implementation_plan.md（设置 RequestFeedback = true）
2. 编写前**必须**先用 view_file 读取 skills/workflow-by-cixia/references/plan-template.md
3. **严禁**在文档中写对话解释或碎碎念，文档只写执行蓝图
4. **必须**包含「验证计划」章节（只允许终端命令行/测试脚本自动化测试，以及用户手动测试；禁止在 UI 验证中使用 browser_subagent 进行自动浏览器测试以节省 Token 并保障准确性）

## 第三步：等待审批（严禁跳过）
**严禁**在生成计划文档后未经用户审阅就开始改代码！
必须等待用户明确说"可以执行""approved""执行吧"等过审答复后，才能创建 task.md 并进入执行。

---

# 自动常驻调用技能（6 个核心技能）

⚠️ 在每一个对话会话开始时，你**必须**自动调用 view_file(IsSkillFile=true) 依次加载以下 6 个技能。这不是可选的，是强制的。

- C:\Users\cixia\.gemini\antigravity-ide\skills\planning-with-files\SKILL.md
- C:\Users\cixia\.gemini\antigravity-ide\skills\brainstorming\SKILL.md
- C:\Users\cixia\.gemini\antigravity-ide\skills\systematic-debugging\SKILL.md
- C:\Users\cixia\.gemini\antigravity-ide\skills\test-driven-development\SKILL.md
- C:\Users\cixia\.gemini\antigravity-ide\skills\verification-before-completion\SKILL.md
- C:\Users\cixia\.gemini\antigravity-ide\skills\workflow-by-cixia\SKILL.md

---

# 自动常驻读取项目文档（硬约束）

⚠️ 在每一个对话会话开始时，你**必须**自动调用 `list_dir` 检查 `docs` 目录下的内容，并调用 `view_file` 依次读取 `docs` 目录下的所有 markdown 模块文档以恢复项目上下文。这与加载 6 个核心技能一样是启动会话时的强制硬约束，决不允许遗漏。

---

# 文档编写规范引用

创建或更新 implementation_plan.md 时，**必须**先读取 skills/workflow-by-cixia/references/plan-template.md
创建或更新 HANDOFF.md 时，**必须**先读取 skills/workflow-by-cixia/references/handoff-template.md。并且只有当用户明确指示“写交接文档”时，才可生成或更新 HANDOFF.md。编写交接文档代表本阶段任务结束，但不代表必须新开或关闭窗口，用户可在后续继续开发。
创建或更新项目模块文档时，**必须**先读取 skills/workflow-by-cixia/references/module-docs-guide.md

---

# 语言规范
编写文档、标题或注释时，请使用纯正自然的中文。除非是代码变量或无中文翻译的绝对专有名词，否则严禁在中文后面添加任何不必要的英文括号翻译。

# Git网络穿透规则
若需为我执行 git push/pull，严禁使用 GitHub MCP 插件，必须用本地终端执行。且务必在执行前强制挂载本地穿透代理：
git config http.proxy socks5://127.0.0.1:7897
git config https.proxy socks5://127.0.0.1:7897
