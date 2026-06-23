# s06 深入 Claude Code 源码：Subagent 的三种模式与设计决策

## 核心叙事线

**一个路由决策，三种执行路径，背后是缓存优化与权限隔离的权衡。**

Claude Code 的 Subagent 不是"一种模式"，而是三种：Normal、Fork、General-Purpose。它们共享"上下文隔离"的核心思想，但在缓存优化、权限处理、系统提示上各有不同。

---

## 一、三种模式的路由逻辑

### 1.1 源码入口：AgentTool.tsx

```typescript
// AgentTool.tsx:318-322
const effectiveType = subagent_type ?? (isForkSubagentEnabled() ? undefined : GENERAL_PURPOSE_AGENT.agentType);
const isForkPath = effectiveType === undefined;
```

**决策树：**

```
subagent_type 有值？
├─ 是 → Normal Subagent（指定的专业类型）
└─ 否 → isForkSubagentEnabled()？
         ├─ true  → Fork Subagent（cache 优化路径）
         └─ false → General-Purpose（默认兜底）
```

### 1.2 三种模式对比

| 维度 | Normal | Fork | General-Purpose |
|------|--------|------|-----------------|
| **触发条件** | 指定 `subagent_type` | 未指定 + fork gate 开启 | 未指定 + fork gate 关闭 |
| **上下文** | 全新 `messages[]` | `buildForkedMessages()` 构造共享前缀 | 全新 `messages[]` |
| **Prompt Cache** | ❌ 不共享 | ✅ 尽力优化（不保证命中） | ❌ 不共享 |
| **权限模式** | `shouldAvoidPermissionPrompts`（自动拒绝） | `bubble`（冒泡到父终端） | `shouldAvoidPermissionPrompts`（自动拒绝） |
| **System Prompt** | 专用（Explore/Plan/Code 等） | 继承父 Agent 的 prompt | 通用全能型 |
| **工具集** | 按类型过滤（如 Explore 只读） | `['*']` 与父完全一致 | `['*']` 全部工具 |

---

## 二、Fork Gate：Cache 优化是否可用

### 2.1 源码：forkSubagent.ts

```typescript
// forkSubagent.ts:32-39
export function isForkSubagentEnabled(): boolean {
  if (feature('FORK_SUBAGENT')) {        // 条件1: 编译时特性开关
    if (isCoordinatorMode()) return false // 条件2: 不能是协调器模式
    if (getIsNonInteractiveSession()) return false // 条件3: 必须是交互式会话
    return true
  }
  return false
}
```

### 2.2 三个条件缺一不可

| 条件 | 类型 | 说明 |
|------|------|------|
| `feature('FORK_SUBAGENT')` | 编译时开关 | `bun:bundle` 构建时决定，从二进制中 tree-shake |
| `!isCoordinatorMode()` | 运行时状态 | Coordinator 模式与 Fork 互斥 |
| `!getIsNonInteractiveSession()` | 运行时状态 | 必须是交互式会话（非管道/SDK/headless） |

### 2.3 Coordinator Mode 的判断

```typescript
// coordinatorMode.ts:36-41
export function isCoordinatorMode(): boolean {
  if (feature('COORDINATOR_MODE')) {
    return isEnvTruthy(process.env.CLAUDE_CODE_COORDINATOR_MODE)
  }
  return false
}
```

`CLAUDE_CODE_COORDINATOR_MODE` 是**运行时状态变量**，由 `matchSessionMode()` 在恢复会话时程序化设置，不是用户在 settings.json 中配置的环境变量。

### 2.4 完整决策树

```
Fork 可用？
├─ 编译时 FORK_SUBAGENT=false → ❌ 整个功能从二进制中移除
└─ 编译时 FORK_SUBAGENT=true
   ├─ CLAUDE_CODE_COORDINATOR_MODE=1 → ❌ 协调器模式独占
   └─ 非协调器模式
      ├─ 非交互式会话（管道/SDK/headless）→ ❌ 不支持
      └─ 交互式会话 → ✅ Fork 可用
```

---

## 三、Normal Subagent：指定类型的专业 Agent

### 3.1 指定 `subagent_type` 的效果

以 `s_full.py` 的实现为例：

```python
def run_subagent(prompt: str, agent_type: str = "Explore") -> str:
    sub_tools = [
        {"name": "bash", ...},
        {"name": "read_file", ...},
    ]
    if agent_type != "Explore":  # 只有非 Explore 才给写权限
        sub_tools += [
            {"name": "write_file", ...},
            {"name": "edit_file", ...},
        ]
```

### 3.2 内置 Agent 类型注册表

```python
AGENT_TYPES = {
    "explore": {
        "tools": ["bash", "read_file"],  # 只读！
        "prompt": "You are an exploration agent. Search and analyze, but NEVER modify files.",
    },
    "code": {
        "tools": "*",  # 全部工具
        "prompt": "You are a coding agent. Implement the requested changes efficiently.",
    },
    "plan": {
        "tools": ["bash", "read_file"],  # 只读！
        "prompt": "You are a planning agent. Analyze and output a plan. Do NOT make any changes.",
    },
}
```

> **官方文档补充：** 内置 agent 的实际模型选择如下，这是一个重要的设计决策——Explore 选择 Haiku 是为了追求速度和低成本：

| Agent | 模型 | 工具 | 说明 |
|-------|------|------|------|
| **Explore** | **Haiku**（快速低延迟） | 只读（无 Write/Edit） | 文件发现、代码搜索、代码库探索。支持 `quick`/`medium`/`very thorough` 三种彻底程度 |
| **Plan** | 继承主会话 | 只读（无 Write/Edit） | Plan 模式下的代码库研究，探索结果留在独立上下文中 |
| **General-purpose** | 继承主会话 | 全部工具 | 复杂多步任务，需要探索+修改+推理的场景 |
| **statusline-setup** | Sonnet | — | 运行 `/statusline` 时自动调用 |
| **claude-code-guide** | Haiku | — | 回答 Claude Code 功能问题时自动调用 |

> **关于 CLAUDE.md 加载：** Explore 和 Plan **跳过** CLAUDE.md 文件和父会话的 git status，以保持研究的快速和低成本。其他所有内置和自定义 subagent 都会加载两者。

### 3.3 关键设计

- **专用 System Prompt**：每个类型有明确的角色定位和行为约束
- **过滤后的工具集**：Explore/Plan 只给只读工具，防止意外修改
- **明确的输出格式**：要求返回简洁报告，因为 caller 会转达给用户

---

## 四、General-Purpose：默认的全能型 Agent

### 4.1 源码：generalPurposeAgent.ts

```typescript
const SHARED_PREFIX = `You are an agent for Claude Code, Anthropic's official CLI for Claude.
Given the user's message, you should use the tools available to complete the task.
Complete the task fully—don't gold-plate, but don't leave it half-done.`

const SHARED_GUIDELINES = `Your strengths:
- Searching for code, configurations, and patterns across large codebases
- Analyzing multiple files to understand system architecture
- Investigating complex questions that require exploring many files
- Performing multi-step research tasks

Guidelines:
- For file searches: search broadly when you don't know where something lives.
- For analysis: Start broad and narrow down. Use multiple search strategies.
- Be thorough: Check multiple locations, consider different naming conventions.
- NEVER create files unless absolutely necessary. ALWAYS prefer editing existing files.
- NEVER proactively create documentation files (*.md) or README files.`
```

### 4.2 与专用类型的区别

| 方面 | General-Purpose | 专用类型（如 Explore） |
|------|-----------------|----------------------|
| **定位** | 什么都能做 | 专注特定任务 |
| **工具** | `['*']` 全部 | 按类型过滤（如只读） |
| **Prompt** | 通用指南 | 专门的角色约束 |
| **使用场景** | 未指定类型时的默认 | 明确知道需要什么类型的 agent |

---

## 五、Fork Subagent：Cache 优化路径

### 5.1 核心思想：共享 Prompt Cache

```typescript
// forkedAgent.ts:57-68
/**
 * Parameters that must be identical between the fork and parent API requests
 * to share the parent's prompt cache. The Anthropic API cache key is composed of:
 * system prompt, tools, model, messages (prefix), and thinking config.
 */
export type CacheSafeParams = {
  systemPrompt: SystemPrompt           // 必须一致
  userContext: { [k: string]: string } // 必须一致
  systemContext: { [k: string]: string } // 必须一致
  toolUseContext: ToolUseContext        // 必须一致
  forkContextMessages: Message[]       // 必须一致
}
```

### 5.2 buildForkedMessages() 的工作原理

```typescript
// forkSubagent.ts:96-106
/**
 * For prompt cache sharing, all fork children must produce byte-identical
 * API request prefixes. This function:
 * 1. Keeps the full parent assistant message (all tool_use blocks, thinking, text)
 * 2. Builds a single user message with tool_results for every tool_use block
 *    using an identical placeholder, then appends a per-child directive text block
 *
 * Result: [...history, assistant(all_tool_uses), user(placeholder_results..., directive)]
 * Only the final text block differs per child, maximizing cache hits.
 */
```

### 5.3 Cache 命中的五个关键组件

| 组件 | 说明 |
|------|------|
| System Prompt | 父子必须字节级一致 |
| Tools | 父子必须字节级一致 |
| Model | 父子必须字节级一致 |
| Messages Prefix | 通过 `buildForkedMessages()` 构造一致前缀 |
| Thinking Config | 父子的 thinking config 参数（如 `budget_tokens`）必须一致，否则破坏前缀一致性 |

### 5.4 Cache 不保证命中

Fork 是"尽力优化"，不是"保证命中"。可能不命中的原因：
- 缓存过期（TTL 到了）
- 缓存被驱逐（LRU 满了）
- `maxOutputTokens` 改变了 thinking config
- 其他意外因素破坏了前缀一致性

---

## 六、权限处理

### 6.1 源码视角：Fork vs Normal 的权限差异

Fork 子 Agent 共享父 Agent 的 UI 上下文，权限弹窗在父终端显示，用户可以审批：

```typescript
// forkSubagent.ts:67
export const FORK_AGENT = {
  permissionMode: 'bubble',  // 权限弹窗冒泡到父终端
  // ...
}
```

Normal 和 General-Purpose 在后台运行，无法显示 UI，因此采用自动拒绝策略：

```typescript
// forkedAgent.ts:356-374
const getAppState = overrides?.shareAbortController
  ? parentContext.getAppState  // 共享父的（可显示 UI）
  : () => {
      const state = parentContext.getAppState()
      return {
        ...state,
        toolPermissionContext: {
          ...state.toolPermissionContext,
          shouldAvoidPermissionPrompts: true,  // 禁止弹出权限提示
        },
      }
    }
```

当 `shouldAvoidPermissionPrompts: true` 时的处理流程：

```typescript
// permissions.ts:929-952
if (appState.toolPermissionContext.shouldAvoidPermissionPrompts) {
  // 1. 先给 hooks 一个机会允许/拒绝
  const hookDecision = await runPermissionRequestHooksForHeadlessAgent(...)
  if (hookDecision) {
    return hookDecision
  }
  // 2. 如果没有 hook 决策 → 自动拒绝
  return {
    behavior: 'deny',
    message: AUTO_REJECT_MESSAGE(tool.name),
  }
}
```

拒绝消息：

```
Permission to use {toolName} has been denied.
You should only try to work around this restriction in reasonable ways
that do not attempt to bypass the intent behind this denial.
If you believe this capability is essential to complete the user's request,
STOP and explain to the user what you were trying to do and why you need
this permission. Let the user decide how to proceed.
```

### 6.2 官方文档补充：完整的权限模式

源码中的 `shouldAvoidPermissionPrompts` 只是其中一种机制。官方文档定义了 **6 种权限模式**，可通过 `permissionMode` frontmatter 字段配置：

| 模式 | 行为 |
|------|------|
| `default` | 标准权限检查，弹提示 |
| `acceptEdits` | 自动接受文件编辑和常见文件系统命令（限于工作目录内） |
| `auto` | 后台分类器审查命令和受保护目录写入 |
| `dontAsk` | 自动拒绝权限提示（显式允许的工具仍然生效） |
| `bypassPermissions` | 跳过权限提示（谨慎使用，会跳过 `.git`、`.claude` 等目录的保护） |
| `plan` | Plan 模式（只读探索） |

**优先级规则（重要）：**
- 如果父会话使用 `bypassPermissions` 或 `acceptEdits`，**子 agent 无法覆盖**
- 如果父会话使用 `auto` 模式，子 agent 继承 auto 模式，frontmatter 中的 `permissionMode` 被忽略
- 前台 subagent 的权限提示直接传递给用户
- 后台 subagent 的权限提示会在主会话中浮现（v2.1.186 起），标注是哪个 subagent 在请求

### 6.3 设计原因

| 场景 | 能显示 UI 吗 | 权限处理 |
|------|-------------|---------|
| Fork | ✅ 共享父终端 | 冒泡到父终端，用户审批 |
| 前台 Subagent | ✅ 阻塞主会话 | 权限提示直接传递给用户 |
| 后台 Subagent | ⚠️ v2.1.186 起可浮现 | 提示在主会话中浮现，标注来源 |
| 旧版后台 Subagent | ❌ | 自动拒绝，让 agent 自己想办法或停下来报告 |

---

## 七、Fork 的触发与防护

### 7.1 官方文档补充：Fork 的用户触发方式

源码中的 `isForkSubagentEnabled()` 是内部路由判断。从用户视角，Fork 有更简单的控制方式：

**环境变量控制：**
- `CLAUDE_CODE_FORK_SUBAGENT=1` — 显式启用 fork 模式
- `CLAUDE_CODE_FORK_SUBAGENT=0` — 显式禁用 fork 模式
- 从 **v2.1.161 起 `/fork` 命令默认启用**，不需要设环境变量

**用户命令：**
```
/fork draft unit tests for the parser changes so far
```
Fork 会在后台运行，用户可以继续在主会话工作。完成后，结果作为消息返回主会话。

**启用 fork 模式的副作用（重要）：**
- Claude 可以显式请求 `fork` subagent 类型来 spawn fork
- **所有 subagent spawn 都变为后台运行**（无论是否是 fork），除非设 `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`

**Fork 的交互面板：**
- `↑`/`↓` — 在行间移动
- `Enter` — 打开选中 fork 的 transcript，可发送后续消息
- `x` — 关闭已完成的 fork 或停止运行中的 fork
- `Esc` — 返回提示输入

### 7.2 递归 Fork 防护（源码）

```typescript
// forkSubagent.ts:78-89
export function isInForkChild(messages: MessageType[]): boolean {
  return messages.some(m => {
    if (m.type !== 'user') return false
    const content = m.message.content
    if (!Array.isArray(content)) return false
    return content.some(
      block =>
        block.type === 'text' &&
        block.text.includes(`<${FORK_BOILERPLATE_TAG}>`),
    )
  })
}
```

### 7.3 双重检查

```typescript
// AgentTool.tsx:332-334
if (toolUseContext.options.querySource === `agent:builtin:${FORK_AGENT.agentType}`
    || isInForkChild(toolUseContext.messages)) {
  throw new Error('Fork is not available inside a forked worker. Complete your task directly using your tools.');
}
```

- **主要检查**：`querySource`（抗压缩，在 spawn 时设置）
- **兜底检查**：扫描消息历史中的 `FORK_BOILERPLATE_TAG`

---

## 八、教学版的简化是刻意的

| 真实实现 | 教学版简化 | 原因 |
|---------|-----------|------|
| 三种模式 | 一种（fresh messages） | 概念清晰 |
| Prompt cache 共享 | 省略 | 教学版不涉及 API 层优化 |
| 递归 fork 防护 | "子 Agent 无 task 工具" | 简化表达 |
| Async/Sync 两种路径 | 只讲同步 | s06 先理解同步模型 |
| 编译时特性开关 | 省略 | 不影响概念理解 |

---

## 九、关键源码文件索引

| 文件 | 职责 |
|------|------|
| `AgentTool.tsx` | 主路由逻辑，决定走哪条路径 |
| `forkSubagent.ts` | Fork 模式实现、`isForkSubagentEnabled()`、`buildForkedMessages()` |
| `forkedAgent.ts` | Cache-safe 参数、`createSubagentContext()`、`runForkedAgent()` |
| `generalPurposeAgent.ts` | General-Purpose 的 system prompt 定义 |
| `coordinatorMode.ts` | Coordinator 模式判断（与 Fork 互斥） |
| `permissions.ts` | 权限处理逻辑、`shouldAvoidPermissionPrompts` |

---

## 十、核心洞察

1. **路由是确定性的**：`subagent_type` 是否有值 + `isForkSubagentEnabled()` 是否为 true，两个布尔值决定一切
2. **Fork 是编译时开关**：`feature('FORK_SUBAGENT')` 在构建时决定，不是运行时配置
3. **Cache 是尽力优化**：Fork 路径构造一致前缀，但不保证命中
4. **权限是 UI 问题**：能显示 UI 就让用户决定，不能就自动拒绝
5. **Coordinator 与 Fork 互斥**：两种编排模式不能同时存在

---

## 十一、用户功能概览（官方文档补充）

> 以下内容补充源码分析未覆盖的用户侧功能。源码分析聚焦"内部如何路由"，本节聚焦"用户如何使用"。

### 11.1 自定义 Subagent

Subagent 不仅是内置的三种类型，用户可以通过 **Markdown 文件 + YAML frontmatter** 定义自己的 subagent：

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

- frontmatter 定义配置，Markdown body 成为 system prompt
- subagent **只收到自己的 system prompt**（加上环境细节如工作目录），不会收到完整的 Claude Code system prompt
- subagent 在主会话的当前工作目录启动，`cd` 命令不会在 Bash 调用间持久化，也不影响主会话
- 通过 `isolation: worktree` 可以给 subagent 一个隔离的 git worktree 副本

### 11.2 作用域层级

Subagent 定义文件存放在不同位置，决定其作用域和优先级：

| 位置 | 作用域 | 优先级 | 创建方式 |
|------|--------|--------|---------|
| Managed settings | 组织级 | 1（最高） | 管理员部署 |
| `--agents` CLI | 当前会话 | 2 | JSON 传入，不落盘 |
| `.claude/agents/` | 当前项目 | 3 | 交互式或手动 |
| `~/.claude/agents/` | 所有项目 | 4 | 交互式或手动 |
| 插件的 `agents/` | 插件启用处 | 5（最低） | 随插件安装 |

**同名 subagent 高优先级覆盖低优先级。** 项目级 subagent 适合提交到版本控制，团队共享。Claude Code 会递归扫描 `.claude/agents/` 和 `~/.claude/agents/` 子目录。

### 11.3 完整 Frontmatter 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✅ | 唯一标识符，小写+连字符 |
| `description` | ✅ | 描述何时委派给此 subagent |
| `tools` | ❌ | 允许的工具列表，省略则继承全部 |
| `disallowedTools` | ❌ | 禁用的工具列表，从继承或指定列表中移除 |
| `model` | ❌ | `sonnet`/`opus`/`haiku`/`fable`/完整模型ID/`inherit`，默认 `inherit` |
| `permissionMode` | ❌ | 权限模式（见第六节） |
| `maxTurns` | ❌ | 最大 agentic 轮次 |
| `skills` | ❌ | 预加载的 skill 列表，启动时注入完整内容 |
| `mcpServers` | ❌ | MCP 服务器配置（内联定义或引用已配置的服务器名） |
| `hooks` | ❌ | 生命周期 hook（`PreToolUse`/`PostToolUse`/`Stop`） |
| `memory` | ❌ | 持久化记忆作用域：`user`/`project`/`local` |
| `background` | ❌ | `true` 则始终作为后台任务运行 |
| `effort` | ❌ | 推理努力级别：`low`/`medium`/`high`/`xhigh`/`max` |
| `isolation` | ❌ | `worktree` 则在临时 git worktree 中运行 |
| `color` | ❌ | UI 显示颜色：`red`/`blue`/`green`/`yellow`/`purple`/`orange`/`pink`/`cyan` |
| `initialPrompt` | ❌ | 通过 `--agent` 作为主会话运行时，自动提交的第一个用户消息 |

### 11.4 模型解析优先级

当 subagent 被调用时，模型按以下优先级解析（从高到低）：

```
1. CLAUDE_CODE_SUBAGENT_MODEL 环境变量
2. 调用时传入的 model 参数
3. subagent 定义的 model frontmatter
4. 主会话的模型
```

### 11.5 不可用于 Subagent 的工具

以下工具依赖主会话的 UI 或会话状态，即使在 `tools` 字段中列出，subagent 也无法使用：

- `AskUserQuestion`
- `EnterPlanMode`
- `ExitPlanMode`（除非 subagent 的 `permissionMode` 是 `plan`）
- `ScheduleWakeup`
- `WaitForMcpServers`

### 11.6 嵌套 Subagent

从 **v2.1.172** 起，subagent 可以 spawn 自己的 subagent：

- 深度限制为 **5 层**，不可配置
- **Fork 不能 spawn 另一个 Fork**，但可以 spawn 其他类型
- 要阻止某个 subagent spawn 其他 subagent，从 `tools` 中省略 `Agent` 或加入 `disallowedTools`
- `/agents` 面板显示完整树形结构，每行显示 `(+N)` 后代数量

### 11.7 恢复（Resume）机制

- subagent 完成后，Claude 收到其 agent ID
- 通过 `SendMessage` 工具 + agent ID 可以恢复 subagent，**保留完整对话历史**
- Explore 和 Plan 是一次性的，**不能恢复**；需要恢复时使用 `general-purpose` 或自定义 subagent
- 用户只需说"继续之前的 code review"，Claude 会自动恢复
- subagent transcript 存储在 `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`

### 11.8 Auto-compaction

Subagent 支持与主会话相同的自动压缩逻辑：

- 触发条件相同
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 同样适用
- 压缩事件记录在 subagent transcript 文件中
- 主会话压缩时，subagent transcript **不受影响**（独立文件存储）

### 11.9 持久化记忆

`memory` frontmatter 字段给 subagent 一个跨会话持久化的目录：

| 作用域 | 位置 | 适用场景 |
|--------|------|---------|
| `user` | `~/.claude/agent-memory/<name>/` | 跨所有项目的通用知识 |
| `project` | `.claude/agent-memory/<name>/` | 项目特定知识，可提交版本控制 |
| `local` | `.claude/agent-memory-local/<name>/` | 项目特定但不提交版本控制 |

启用后：
- system prompt 自动包含读写记忆目录的指令
- 自动注入 `MEMORY.md` 的前 200 行或 25KB
- Read/Write/Edit 工具自动启用

### 11.10 Skills 预加载

通过 `skills` frontmatter 字段，可以在启动时将 skill 完整内容注入 subagent 上下文：

```yaml
---
name: api-developer
description: Implement API endpoints following team conventions
skills:
  - api-conventions
  - error-handling-patterns
---
```

- 注入的是完整内容，不仅仅是描述
- 未列出的 skill 仍可通过 Skill 工具在执行中调用
- 设置了 `disable-model-invocation: true` 的 skill 不能预加载

### 11.11 Hook 系统

Subagent 可以定义两种 hook：

**Frontmatter hook**（仅在 subagent 活动期间运行）：
```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
```

**项目级 hook**（在主会话中响应 subagent 生命周期）：
```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "db-agent",
        "hooks": [{ "type": "command", "command": "./scripts/setup-db-connection.sh" }]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [{ "type": "command", "command": "./scripts/cleanup-db-connection.sh" }]
      }
    ]
  }
}
```

### 11.12 MCP 服务器作用域

通过 `mcpServers` 字段，可以给 subagent 独占的 MCP 服务器：

```yaml
mcpServers:
  # 内联定义：仅此 subagent 可用
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  # 引用名：复用已配置的服务器
  - github
```

内联定义的服务器在 subagent 启动时连接，结束时断开。这可以避免 MCP 工具描述消耗主会话上下文。

### 11.13 限制 Subagent 的 Spawn 权限

通过 `tools` 字段的 `Agent(agent_type)` 语法，可以限制哪些 subagent 类型可以被 spawn：

```yaml
tools: Agent(worker, researcher), Read, Bash
```

这是白名单：只能 spawn `worker` 和 `researcher`。省略 `Agent` 则完全不能 spawn subagent。

### 11.14 Fork vs Named Subagent 对比

| 维度 | Fork | Named Subagent |
|------|------|---------------|
| **上下文** | 完整对话历史 | 全新上下文 + 传入的 prompt |
| **System Prompt 和 Tools** | 与主会话相同 | 来自 subagent 定义文件 |
| **模型** | 与主会话相同 | 来自 subagent 的 `model` 字段 |
| **权限** | 提示在终端浮现 | 后台运行时在主会话浮现 |
| **Prompt Cache** | 与主会话共享 | 独立缓存 |

### 11.15 使用建议

**使用主会话的场景：**
- 需要频繁来回交互或迭代优化
- 多个阶段共享大量上下文（规划→实现→测试）
- 快速、有针对性的修改
- 延迟敏感（subagent 需要时间收集上下文）

**使用 subagent 的场景：**
- 任务产生大量不需要留在主上下文中的输出
- 需要强制执行特定的工具限制或权限
- 工作是自包含的，可以返回摘要

**使用 fork 的场景：**
- named subagent 需要太多背景信息才有效
- 想从同一起点并行尝试多种方案
- 任务需要与主会话相同的工具和权限

---

<!-- translation-sync: zh@v1 -->
