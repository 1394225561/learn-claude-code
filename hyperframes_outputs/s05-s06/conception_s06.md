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
| **权限模式** | `acceptEdits`（自动拒绝） | `bubble`（冒泡到父终端） | `acceptEdits`（自动拒绝） |
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
| Thinking Config | 不能设置不同的 `maxOutputTokens`（会改变 `budget_tokens`） |

### 5.4 Cache 不保证命中

Fork 是"尽力优化"，不是"保证命中"。可能不命中的原因：
- 缓存过期（TTL 到了）
- 缓存被驱逐（LRU 满了）
- `maxOutputTokens` 改变了 thinking config
- 其他意外因素破坏了前缀一致性

---

## 六、权限处理：三种模式的差异

### 6.1 Fork Subagent：权限冒泡

```typescript
// forkSubagent.ts:67
export const FORK_AGENT = {
  permissionMode: 'bubble',  // 权限弹窗冒泡到父终端
  // ...
}
```

Fork 子 Agent 共享父 Agent 的 UI 上下文，权限弹窗在父终端显示，用户可以审批。

### 6.2 Normal 和 General-Purpose：自动拒绝

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

### 6.3 拒绝消息

```
Permission to use {toolName} has been denied.
You should only try to work around this restriction in reasonable ways
that do not attempt to bypass the intent behind this denial.
If you believe this capability is essential to complete the user's request,
STOP and explain to the user what you were trying to do and why you need
this permission. Let the user decide how to proceed.
```

### 6.4 设计原因

| 模式 | 能显示 UI 吗 | 权限处理 |
|------|-------------|---------|
| Fork | ✅ 共享父终端 | 冒泡到父终端，用户审批 |
| Normal | ❌ 后台运行 | 自动拒绝，让 agent 自己想办法或停下来报告 |
| General-Purpose | ❌ 后台运行 | 同上 |

---

## 七、递归 Fork 防护

### 7.1 源码实现

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

### 7.2 双重检查

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

<!-- translation-sync: zh@v1 -->
