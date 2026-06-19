# Subagent 速查

## 核心模式

```python
def spawn_subagent(description: str) -> str:
    messages = [{"role": "user", "content": description}]  # 全新上下文
    for _ in range(30):
        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=SUB_TOOLS,  # 没有 task 工具！
        )
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            break
        # 执行工具...
    return extract_text(messages[-1]["content"])  # 只返回结论
```

## 关键设计

| 特性 | 实现方式 |
|------|---------|
| 上下文隔离 | 全新 `messages` 列表 |
| 防递归 | `SUB_TOOLS` 中排除 `task` |
| 结果丢弃 | 只取最后一条消息的文本 |
| 文件副作用保留 | bash/write_file 执行真实命令 |

## Python 语法要点

- `getattr(b, "text", "")` — 安全属性访问（JS: `b?.text ?? ""`）
- `isinstance(x, list)` — 类型检查（JS: `Array.isArray(x)`）
- `for _ in range(30)` — `_` 表示不需要循环变量
