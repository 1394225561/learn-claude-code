# 项目架构总览

> **learn-claude-code** — 一个从零到一的 AI Agent Harness 工程教学项目。
>
> 核心理念：**Agency 来自模型训练，而非代码编排。工程师的工作是构建 Harness（工具 + 知识 + 上下文 + 权限），而非"构建智能"。**

---

## 目录结构

```
learn-claude-code/
│
├── README.md / README-zh.md / README-ja.md   # 项目主文档（三语）
├── LICENSE                                     # MIT 开源协议
├── requirements.txt                            # Python 依赖
├── .env.example                                # 环境变量模板
├── .gitignore                                  # Git 忽略规则
│
├── s01_agent_loop/         ─┐
├── s02_tool_use/            │
├── s03_permission/          │
├── s04_hooks/               │
├── s05_todo_write/          │
├── s06_subagent/            │  20 课（新版主轨道）
├── s07_skill_loading/       │  每课：README.md(中) + README.en.md + README.ja.md
├── s08_context_compact/     │       + code.py + images/
├── s09_memory/              │
├── s10_system_prompt/       │
├── s11_error_recovery/      │
├── s12_task_system/         │
├── s13_background_tasks/    │
├── s14_cron_scheduler/      │
├── s15_agent_teams/         │
├── s16_team_protocols/      │
├── s17_autonomous_agents/   │
├── s18_worktree_isolation/  │
├── s19_mcp_plugin/          │
├── s20_comprehensive/      ─┘
│
├── agents/                 # 旧版 12 课可运行副本 + s_full.py 综合参考
├── docs/                   # 旧版 12 课文档（en/zh/ja 三语）
├── lessons/                # 20 课 HTML 交互式教学页面
├── reference/              # 20 课参考速查文档
├── learning-records/       # 学习过程记录
│
├── skills/                 # Skill 文件（供 s07 课程使用）
│   ├── agent-builder/
│   ├── code-review/
│   ├── mcp-builder/
│   └── pdf/
│
├── assets/                 # HTML 课程共享资源
├── tests/                  # Python 测试
├── web/                    # Next.js Web 平台
└── .github/workflows/      # CI/CD
```

---

## 各目录 / 文件功能详解

### 1. 根目录配置文件

| 文件 | 功能 |
|------|------|
| `README.md` | 英文主文档，阐述项目哲学、学习路径、20 课索引 |
| `README-zh.md` | 中文主文档 |
| `README-ja.md` | 日文主文档 |
| `LICENSE` | MIT 开源协议，版权归 shareAI Lab |
| `requirements.txt` | Python 依赖：`anthropic>=0.25.0`、`python-dotenv`、`pyyaml` |
| `.env.example` | 环境变量模板，含 `ANTHROPIC_API_KEY`、`MODEL_ID`，以及多个兼容 provider 的配置示例（MiniMax、GLM、Kimi、DeepSeek） |
| `.gitignore` | 忽略 Python 缓存、虚拟环境、Node 产物、运行时 artifact（`.memory/`、`.tasks/`、`.teams/` 等） |

---

### 2. `s01_agent_loop/` ~ `s20_comprehensive/` — 20 课主轨道（新版）

**这是项目的主体内容。** 每课是一个独立文件夹，递进式教授一个 Harness 机制。

#### 每课结构

```
sXX_topic/
  README.md          # 中文完整叙述（主文档）
  README.en.md       # 英文翻译
  README.ja.md       # 日文翻译
  code.py            # 独立可运行的 Python 实现
  images/            # SVG 架构图（部分课程有多个）
```

#### 20 课索引与核心内容

| 课号 | 目录名 | 主题 | 核心机制 |
|------|--------|------|----------|
| s01 | `s01_agent_loop/` | Agent Loop | `while True` + `stop_reason` 检查，模型决策循环继续或终止 |
| s02 | `s02_tool_use/` | Tool Use | `TOOL_HANDLERS` 调度表，多工具注册，并发执行 |
| s03 | `s03_permission/` | Permission | `PermissionRule` 权限规则，审批管线 |
| s04 | `s04_hooks/` | Hook System | `PreToolUse`/`PostToolUse` 扩展点，不改主循环 |
| s05 | `s05_todo_write/` | TodoWrite | `TodoItem` 计划列表，先规划后执行 |
| s06 | `s06_subagent/` | Subagent | 子 Agent 隔离上下文，结果回传 |
| s07 | `s07_skill_loading/` | Skill Loading | `SkillManifest` 按需加载技能知识 |
| s08 | `s08_context_compact/` | Context Compact | snipCompact / microCompact / toolResultBudget / autoCompact 多层压缩 |
| s09 | `s09_memory/` | Memory | selection / extraction / consolidation 三阶段记忆 |
| s10 | `s10_system_prompt/` | System Prompt | 运行时组装，按需加载各段 |
| s11 | `s11_error_recovery/` | Error Recovery | token 超限升级、回退模型、重试策略 |
| s12 | `s12_task_system/` | Task System | `TaskRecord` 文件持久化，`blockedBy` 依赖图 |
| s13 | `s13_background_tasks/` | Background Tasks | 线程执行慢操作，通知队列注入结果 |
| s14 | `s14_cron_scheduler/` | Cron Scheduler | 持久化定时调度，session 内自动触发 |
| s15 | `s15_agent_teams/` | Agent Teams | `MessageBus` 异步邮箱，inbox/outbox 模式 |
| s16 | `s16_team_protocols/` | Team Protocols | 关机握手、计划审批、固定请求-回复格式 |
| s17 | `s17_autonomous_agents/` | Autonomous Agents | idle cycle、auto-claim、自组织 |
| s18 | `s18_worktree_isolation/` | Worktree Isolation | `WorktreeRecord` 任务-目录绑定，无干扰并行 |
| s19 | `s19_mcp_plugin/` | MCP Plugin | 多传输协议、channel 路由、工具池装配 |
| s20 | `s20_comprehensive/` | Comprehensive Agent | 所有机制合一的完整 Agent |

#### 学习路径（6 阶段）

```
阶段 1（核心能力）：s01 → s02 → s03 → s04
阶段 2（复杂任务）：s05 → s06 → s08
阶段 3（记忆恢复）：s09 → s10 → s11
阶段 4（长期任务）：s12 → s13 → s14
阶段 5（多 Agent）：s15 → s16 → s17 → s18
阶段 6（扩展组装）：s07 → s19 → s20
```

---

### 3. `agents/` — 旧版 12 课可运行副本

| 文件 | 功能 |
|------|------|
| `__init__.py` | 包说明，注释标注"模型是 Agent，这些文件是 Harness" |
| `s01_agent_loop.py` | Agent Loop 实现（单一 bash 工具） |
| `s02_tool_use.py` | 多工具调度 |
| `s03_todo_write.py` | TodoWrite 计划系统 |
| `s04_subagent.py` | 子 Agent 隔离 |
| `s05_skill_loading.py` | 技能加载 |
| `s06_context_compact.py` | 上下文压缩 |
| `s07_task_system.py` | 任务系统 |
| `s08_background_tasks.py` | 后台任务 |
| `s09_agent_teams.py` | Agent 团队 |
| `s10_team_protocols.py` | 团队协议 |
| `s11_autonomous_agents.py` | 自治 Agent |
| `s12_worktree_task_isolation.py` | Worktree 隔离 |
| `s_full.py` | **综合参考实现**：合并 s01-s11 所有机制，是项目的"终点站" |

> **注意**：旧版 s01-s12 与新版 s01-s20 的编号**不一致**。旧版 s03 = 新版 s05（TodoWrite），旧版 s04 = 新版 s06（Subagent），以此类推。详见 README 中的映射表。

---

### 4. `docs/` — 旧版 12 课文档（三语）

```
docs/
  en/s01-the-agent-loop.md ~ s12-worktree-task-isolation.md
  zh/s01-the-agent-loop.md ~ s12-worktree-task-isolation.md
  ja/s01-the-agent-loop.md ~ s12-worktree-task-isolation.md
```

旧版文档，配合 `agents/` 目录的代码。Web 平台当前仍渲染此目录内容。新版 20 课文档已迁移到各 `sXX_*/README.md` 中。

---

### 5. `lessons/` — 20 课 HTML 交互式教学页面

```
lessons/
  0001-agent-loop.html
  0002-tool-dispatch.html
  0003-permission.html
  ...
  0020-comprehensive.html
```

每课是一个独立 HTML 文件，结构统一：问题描述 → 核心思路 → 代码解析 → 前端类比 → Python 语法速查 → 动手实验 → 测验 → 下一步。使用 `assets/style.css` 共享样式和 `assets/quiz.js` 测验组件。

面向**前端开发者**的友好格式，无需 Python 环境即可阅读学习。

---

### 6. `reference/` — 参考速查文档

```
reference/
  0001-agent-loop.md
  0002-tool-dispatch.md
  ...
  0020-comprehensive.md
  0000-architecture.md   ← 本文件
```

每课的精简速查卡：核心模式代码片段、关键信号表、消息格式、设计要点。适合快速回顾，不适合初次学习。

---

### 7. `learning-records/` — 学习过程记录

| 文件 | 内容 |
|------|------|
| `0001-learner-background.md` | 学习者背景画像：6 年前端经验，Python 零基础，AI 零基础 |
| `0002-agent-loop-concept.md` | 第 1 课教学设计完成记录 |
| `0003-all-lessons-complete.md` | 全部 20 课 HTML 课程编写完成记录 |

记录教学过程中的关键决策和进度，供教学设计参考。

---

### 8. `skills/` — Skill 文件

供 s07（Skill Loading）课程使用的技能定义。每个 skill 包含 `SKILL.md`（技能描述 + 使用指南）和可选的 `references/`、`scripts/` 子目录。

| Skill | 功能 |
|-------|------|
| `agent-builder/` | Agent 构建指南：设计理念、最小 Agent 模板、工具模板、子 Agent 模式、初始化脚本 |
| `code-review/` | 代码审查清单：安全、正确性、性能、可维护性、测试 |
| `mcp-builder/` | MCP Server 构建指南：Python/TypeScript 模板、高级模式、测试方法 |
| `pdf/` | PDF 处理：读取、创建、合并、分割 |

#### `skills/agent-builder/` 详解

```
agent-builder/
  SKILL.md                        # 技能主文档：哲学、三要素、反模式
  references/
    agent-philosophy.md           # Agent 设计哲学深度解读
    minimal-agent.py              # 最小可运行 Agent（~80 行）
    subagent-pattern.py           # 子 Agent 上下文隔离模式
    tool-templates.py             # 工具定义模板
  scripts/
    init_agent.py                 # Agent 脚手架生成器（支持 Level 0-4）
```

---

### 9. `assets/` — HTML 课程共享资源

| 文件 | 功能 |
|------|------|
| `style.css` | 全局样式：Tufte CSS 风格，优先可读性和打印友好 |
| `quiz.js` | 可复用测验组件：`Quiz.render(containerId, questions)` |

---

### 10. `tests/` — Python 测试

| 文件 | 测试内容 |
|------|----------|
| `test_agents_smoke.py` | 冒烟测试：确保 `agents/` 下所有 `.py` 文件可编译 |
| `test_compaction_tool_pairs.py` | 压缩正确性：验证 snipCompact/reactiveCompact 不会切断 tool_use/tool_result 对 |
| `test_s_full_background.py` | `s_full.py` 的 BackgroundManager 单元测试 |
| `test_todo_write_string_input.py` | TodoWrite 字符串输入兼容性：JSON 字符串、Python repr 字符串、安全性 |

测试使用 mock 替代 `anthropic` 和 `dotenv` 依赖，无需真实 API Key 即可运行。

---

### 11. `web/` — Next.js Web 平台

基于 Next.js 16 + React 19 + Tailwind CSS 4 构建的交互式学习平台。

#### 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 16 | 框架（静态导出模式） |
| React 19 | UI 库 |
| Tailwind CSS 4 | 样式 |
| TypeScript | 类型安全 |
| framer-motion | 动画 |
| unified + remark + rehype | Markdown 渲染 |
| diff | 代码差异对比 |

#### 目录结构

```
web/
  package.json                    # 依赖与脚本
  next.config.ts                  # Next.js 配置（静态导出）
  tsconfig.json                   # TypeScript 配置
  postcss.config.mjs              # PostCSS 配置
  vercel.json                     # Vercel 部署配置（域名重定向）
  scripts/
    extract-content.ts            # 构建时内容提取脚本
  public/
    course-assets/                # 各课 SVG 图表（从根目录 images/ 同步）
    *.svg                         # 静态资源
  src/
    app/
      page.tsx                    # 根页面 → 重定向到 /en/
      [locale]/
        page.tsx                  # 首页：核心模式展示 + 学习路径 + 层级概览
        layout.tsx                # 布局（Header + Sidebar）
        (learn)/
          layout.tsx              # 学习区布局
          [version]/
            page.tsx              # 课程详情页
            client.tsx            # 客户端交互
            diff/
              page.tsx            # 版本差异对比
              diff-content.tsx
          compare/page.tsx        # 多版本对比
          layers/page.tsx         # 层级视图
          timeline/page.tsx       # 时间线视图
    components/
      architecture/               # 架构可视化组件
      code/                       # 代码查看器
      diff/                       # 差异对比组件
      docs/                       # 文档渲染器
      layout/                     # Header、Sidebar
      simulator/                  # Agent Loop 模拟器
      timeline/                   # 时间线组件
      ui/                         # 通用 UI 组件（Badge、Card、Tabs）
      visualizations/             # 各课交互式可视化组件（s01-s20）
    data/
      annotations/                # 各课注释数据（s01-s20 JSON）
      scenarios/                  # 各课模拟场景（s01-s20 JSON）
      generated/                  # 构建时生成的数据
      execution-flows.ts          # 执行流数据
    hooks/
      useDarkMode.ts              # 暗色模式 hook
      useSimulator.ts             # 模拟器 hook
      useSteppedVisualization.ts  # 分步可视化 hook
    i18n/
      messages/
        en.json / zh.json / ja.json  # 三语翻译
    lib/
      constants.ts                # 常量：版本顺序、版本元数据、层级定义
      i18n.tsx                    # 国际化工具（客户端）
      i18n-server.ts              # 国际化工具（服务端）
      utils.ts                    # 工具函数
    types/
      agent-data.ts               # TypeScript 类型定义
```

#### 关键页面

- **首页** (`/[locale]/page.tsx`)：展示核心 Agent Loop 代码、消息流可视化、学习路径卡片、层级概览
- **课程详情** (`/[locale]/[version]/page.tsx`)：展示代码、文档、可视化、注释
- **时间线** (`/[locale]/timeline/page.tsx`)：按时间顺序浏览 20 课
- **层级视图** (`/[locale]/layers/page.tsx`)：按 Harness 层级分类浏览
- **差异对比** (`/[locale]/[version]/diff/page.tsx`)：相邻版本代码差异
- **模拟器**：交互式 Agent Loop 模拟器，可视化消息流转

---

### 12. `.github/workflows/` — CI/CD

| 文件 | 功能 |
|------|------|
| `ci.yml` | Web 平台 CI：Node.js 20，`npm ci` → TypeScript 类型检查 → `npm run build` |
| `test.yml` | 全项目测试：Python 3.11 冒烟测试（`pytest tests -q`）+ Web 构建验证 |

两个 workflow 均在 `push`/`pull_request` 到 `main` 分支时触发。

---

## 核心设计哲学

### 1. 模型是 Agent，代码是 Harness

```
Agent = Model (LLM) + Harness (运行环境)

Harness = Tools + Knowledge + Observation + Action + Permissions
```

代码不产生智能，只提供工具、知识、上下文和权限边界。模型自行决策何时调用工具、何时停止。

### 2. 一个循环，层层叠加

所有 20 课都围绕同一个 `while True` 循环展开。每课添加一个机制，循环本身不变：

```python
def agent_loop(messages):
    while True:
        response = client.messages.create(model=MODEL, messages=messages, tools=TOOLS)
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return
        results = execute_tools(response)
        messages.append({"role": "user", "content": results})
```

### 3. 渐进复杂度

```
单工具 → 多工具 → 权限 → Hook → 规划 → 子Agent → 技能 → 压缩
→ 记忆 → 提示词 → 错误恢复 → 任务图 → 后台 → 定时
→ 团队 → 协议 → 自治 → 隔离 → MCP → 综合
```

---

## 技术依赖

### Python 端

- `anthropic>=0.25.0` — Anthropic API 客户端
- `python-dotenv>=1.0.0` — 环境变量加载
- `pyyaml>=6.0` — YAML 解析（技能加载）
- `pytest` — 测试框架（开发依赖）

### Web 端

- Node.js 20+
- Next.js 16.1.6
- React 19.2.3
- Tailwind CSS 4
- TypeScript 5

### 兼容 API Provider

除 Anthropic 原生 API 外，还支持以下兼容 provider（通过 `ANTHROPIC_BASE_URL` 切换）：

| Provider | Model ID |
|----------|----------|
| Anthropic | `claude-sonnet-4-6` |
| MiniMax | `MiniMax-M2.5` |
| GLM (智谱) | `glm-5` |
| Kimi (月之暗面) | `kimi-k2.5` |
| DeepSeek | `deepseek-chat` |

---

## 版本轨道说明

本项目存在**两个并行轨道**：

| 轨道 | 位置 | 课数 | 状态 |
|------|------|------|------|
| **新版（主轨道）** | 根目录 `s01_*` ~ `s20_*` | 20 | 当前规范版本 |
| **旧版（过渡期）** | `agents/` + `docs/` + `web/` | 12 | 保留兼容，逐步淘汰 |

**Web 平台当前仍渲染旧版 `docs/` 轨道。** 新版学习请直接阅读根目录各 `sXX_*/README.md`。
