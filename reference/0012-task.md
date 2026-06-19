# Task System 速查

## Task 数据结构

```python
@dataclass
class Task:
    id: str                          # "task_{timestamp}_{random}"
    subject: str                     # 标题
    description: str                 # 描述
    status: str                      # pending | in_progress | completed
    owner: str | None                # 领取者
    blockedBy: list[str] | None      # 依赖的前置任务 ID
```

## 持久化

每个任务一个 JSON 文件：`.tasks/{id}.json`

## 五个工具

| 工具 | 作用 | 状态流转 |
|------|------|---------|
| `create_task` | 创建任务 | → pending |
| `claim_task` | 领取任务 | pending → in_progress |
| `complete_task` | 完成任务 | in_progress → completed |
| `list_tasks` | 列出所有任务 | — |
| `can_start` | 检查依赖 | — |

## 依赖检查

```python
def can_start(task_id: str) -> bool:
    task = load_task(task_id)
    for dep_id in task.get("blockedBy", []):
        dep = load_task(dep_id)
        if not dep or dep["status"] != "completed":
            return False
    return True
```

## Python 语法要点

- `@dataclass` — 自动生成 `__init__`、`__repr__`、`__eq__`
- `asdict(task)` — dataclass 转字典
- `f"task_{ts:04d}"` — f-string 格式化（`:04d` 零填充）
- `Path.mkdir(exist_ok=True)` — 目录已存在不报错
