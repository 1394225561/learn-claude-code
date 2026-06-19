# Cron Scheduler 速查

## 四层架构

```
cron_scheduler_loop (daemon, 1s轮询)
        ↓
    cron_queue (线程安全队列)
        ↓
queue_processor_loop (Agent空闲时注入)
        ↓
    agent_loop (消费执行)
```

## CronJob 数据结构

```python
@dataclass
class CronJob:
    id: str
    cron: str        # "分 时 日 月 周"
    prompt: str       # 任务描述
    recurring: bool   # 是否重复
    durable: bool     # 是否持久化到磁盘
```

## Cron 表达式

| 表达式 | 含义 |
|--------|------|
| `0 9 * * *` | 每天 09:00 |
| `*/5 * * * *` | 每 5 分钟 |
| `0 0 * * 1` | 每周一 00:00 |

## 线程协作

```python
# 调度器：非阻塞获取锁
if agent_lock.acquire(blocking=False):
    cron_queue.append(job)
    agent_lock.release()

# Agent：消费队列
def consume_cron_queue():
    while cron_queue:
        job = cron_queue.pop(0)
        messages.append({"role": "user", "content": f"[Scheduled] {job.prompt}"})
```

## Python 语法要点

- `@dataclass` — 自动生成 `__init__`
- `field(default_factory=time.time)` — 每实例调用的默认值
- `lock.acquire(blocking=False)` — 非阻塞锁获取
