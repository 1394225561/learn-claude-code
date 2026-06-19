# System Prompt Assembly 速查

## 核心模式

```python
PROMPT_SECTIONS = {
    "identity":  lambda ctx: "You are a coding agent...",
    "tools":     lambda ctx: f"Available tools: {ctx['tool_names']}",
    "workspace": lambda ctx: f"Working directory: {ctx['cwd']}",
    "memory":    lambda ctx: ctx.get("memory_index", ""),
}

def assemble_system_prompt(context):
    sections = []
    for name, builder in PROMPT_SECTIONS.items():
        content = builder(context)
        if content:
            sections.append(content)
    return "\n\n".join(sections)
```

## 确定性缓存

```python
_last_context_key = None
_last_prompt = None

def get_system_prompt(context):
    global _last_context_key, _last_prompt
    key = json.dumps(context, sort_keys=True)  # 确定性键
    if key == _last_context_key:
        return _last_prompt
    _last_prompt = assemble_system_prompt(context)
    _last_context_key = key
    return _last_prompt
```

## 为什么不用 hash()

Python 的 `hash()` 每次运行随机化（安全特性），同样输入不同结果。`json.dumps(sort_keys=True)` 是确定性的。

## Python 语法要点

- `json.dumps(ctx, sort_keys=True, ensure_ascii=False, default=str)` — 确定性序列化
- `global` — 函数内修改模块级变量需显式声明
