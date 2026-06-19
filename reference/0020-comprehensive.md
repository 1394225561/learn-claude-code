# Comprehensive Agent 速查 — 全部机制

## 20 个机制一览

| 层 | 机制 | 课程 |
|----|------|------|
| 核心 | Agent Loop | s01 |
| | Tool Dispatch | s02 |
| | Permission | s03 |
| | Hook System | s04 |
| 复杂任务 | TodoWrite | s05 |
| | Subagent | s06 |
| | Skill Loading | s07 |
| | Context Compact | s08 |
| 记忆恢复 | Memory | s09 |
| | System Prompt | s10 |
| | Error Recovery | s11 |
| 长期任务 | Task Graph | s12 |
| | Background Task | s13 |
| | Cron | s14 |
| 多Agent | Teams | s15 |
| | Protocols | s16 |
| | Autonomous | s17 |
| | Worktree | s18 |
| 扩展 | MCP | s19 |
| 综合 | Comprehensive | s20 |

## 核心循环（始终不变）

```python
while True:
    prepare_context(messages)          # 压缩
    prompt = assemble_system_prompt()  # 提示词
    tools = assemble_tool_pool()       # 工具池
    response = call_llm(messages, tools, recovery_state)  # 重试
    if not tool_use:
        trigger_hooks("Stop")
        return
    for block in tool_uses:
        trigger_hooks("PreToolUse")    # 权限
        execute_tool()
        trigger_hooks("PostToolUse")   # 日志
    collect_background_results()
    consume_cron_queue()
```

## 设计原则

1. **模型决策，Harness 执行**
2. **循环不变性** — 所有机制叠加在外围
3. **开闭原则** — 调度表 + Hook
4. **上下文隔离** — 子 Agent 独立消息列表
5. **渐进式复杂度** — 30 行起步，按需叠加
6. **文件即数据库** — JSON/JSONL 扁平文件
