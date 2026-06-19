# Hook System 速查

## 四个生命周期事件

| 事件 | 触发时机 | 典型用途 |
|------|---------|---------|
| `UserPromptSubmit` | 用户输入后 | 输入过滤、注入上下文 |
| `PreToolUse` | 工具执行前 | 权限检查、参数验证 |
| `PostToolUse` | 工具执行后 | 日志、输出截断 |
| `Stop` | 循环即将退出时 | 强制继续、最终检查 |

## 核心代码

```python
HOOKS = {"UserPromptSubmit": [], "PreToolUse": [], "PostToolUse": [], "Stop": []}

def register_hook(event: str, callback):
    HOOKS[event].append(callback)

def trigger_hooks(event: str, *args):
    for callback in HOOKS[event]:
        result = callback(*args)
        if result is not None:
            return result  # 短路
    return None
```

## 返回值语义

- `None` — 不干预，继续正常流程
- 字符串 — 短路（PreToolUse 阻止执行 / Stop 强制继续）

## Python 语法要点

- `*args` — 可变位置参数，收集为元组（JS 用 `...args` 收集为数组）
