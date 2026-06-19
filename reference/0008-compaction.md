# Context Compaction 速查

## 四层压缩管线（从便宜到昂贵）

| 层 | 函数 | 成本 | 策略 |
|----|------|------|------|
| L3 | `tool_result_budget()` | 最低 | 大结果存磁盘，只留预览 |
| L1 | `snip_compact()` | 低 | 超 50 条裁剪中间，保留头尾 |
| L2 | `micro_compact()` | 低 | 旧工具结果替换为一行摘要 |
| L4 | `compact_history()` | 最高 | LLM 生成完整对话摘要 |

## 执行顺序

```python
def prepare_context(messages):
    messages[:] = tool_result_budget(messages)  # L3
    messages[:] = snip_compact(messages)        # L1
    messages[:] = micro_compact(messages)       # L2
    messages[:] = compact_history(messages)     # L4
```

## 响应式压缩

```python
# API 返回 prompt_too_long 时触发
try:
    response = call_llm(messages)
except PromptTooLongError:
    messages[:] = reactive_compact(messages)
    response = call_llm(messages)  # 重试
```

## Python 语法要点

- `messages[:] = ...` — 切片赋值，原地修改列表（JS 无直接等价）
- `len(str(msgs))` — 粗略 token 估算
- `with path.open("w") as f:` — 上下文管理器（JS 无直接等价）
- `json.dumps(msg, default=str)` — default 处理不可序列化对象
- `for mi, msg in enumerate(messages)` — 同时获取索引和值
