# TodoWrite 速查

## 核心代码

```python
CURRENT_TODOS: list[dict] = []

def run_todo_write(todos: list) -> str:
    global CURRENT_TODOS
    CURRENT_TODOS = todos
    for todo in todos:
        icon = {"pending": "⬜", "in_progress": "🔵", "completed": "✅"}
        print(f"  {icon.get(todo['status'], '❓')} {todo['content']}")
    return f"Updated {len(todos)} todos"
```

## 任务状态

| 状态 | 图标 | 含义 |
|------|------|------|
| `pending` | ⬜ | 待办 |
| `in_progress` | 🔵 | 进行中 |
| `completed` | ✅ | 已完成 |

## 定时提醒

```python
rounds_since_todo = 0

# 每轮循环
rounds_since_todo += 1
if rounds_since_todo >= 3:
    messages.append({"role": "user", "content": "⚠️ 请更新你的任务进度。"})
    rounds_since_todo = 0
```

## 关键洞察

TodoWrite 是**规划能力**，不是执行能力。它帮 Agent 组织思路，不做任何实际工作。

## Python 语法要点

- `global CURRENT_TODOS` — 函数内修改模块级变量需显式声明
- `list[dict]` — Python 3.9+ 泛型注解
- `ast.literal_eval(todos)` — 安全解析 Python 字面量
