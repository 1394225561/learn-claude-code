# Agent Loop 模式速查

## 核心循环

```python
def agent_loop(messages):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = TOOL_HANDLERS[block.name](**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

## 关键信号

| 信号 | 含义 | 动作 |
|------|------|------|
| `stop_reason == "tool_use"` | 模型要调工具 | 执行 → 结果喂回 → 继续 |
| `stop_reason == "end_turn"` | 模型说完了 | 退出循环 |
| `stop_reason == "max_tokens"` | 输出超长 | 退出（s11 会讲恢复策略） |

## 消息格式

```python
# 用户输入
{"role": "user", "content": "你的问题"}

# 模型回复（包含工具调用）
{"role": "assistant", "content": [
    {"type": "text", "text": "让我帮你看看..."},
    {"type": "tool_use", "id": "toolu_xxx", "name": "bash", "input": {"command": "ls"}}
]}

# 工具结果（喂回给模型）
{"role": "user", "content": [
    {"type": "tool_result", "tool_use_id": "toolu_xxx", "content": "file1.py\nfile2.py"}
]}
```

## 设计原则

- **模型决策，harness 执行**：harness 不做任何判断，只执行模型要求的
- **循环不变性**：无论叠加多少机制，核心循环不变
- **工具结果反馈**：工具执行结果必须喂回模型，模型才能继续推理
