# Autonomous Agent 速查

## 生命周期

```
WORK ←→ IDLE → SHUTDOWN
         ↓
    主动扫描任务板
```

## 空闲轮询

```python
IDLE_TIMEOUT = 60       # 空闲超时
IDLE_POLL_INTERVAL = 5  # 轮询间隔

def idle_poll(agent_name, messages, name, role) -> str:
    for _ in range(IDLE_TIMEOUT // IDLE_POLL_INTERVAL):
        time.sleep(IDLE_POLL_INTERVAL)
        # 优先级 1：收件箱
        inbox = BUS.read_inbox(agent_name)
        if inbox: return "work"
        # 优先级 2：任务板
        unclaimed = scan_unclaimed_tasks()
        if unclaimed:
            claim_task(unclaimed[0]["id"], agent_name)
            return "work"
    return "timeout"
```

## 扫描未认领任务

```python
def scan_unclaimed_tasks():
    return [
        t for t in load_all_tasks()
        if t["status"] == "pending"
        and not t.get("owner")
        and can_start(t["id"])
    ]
```

## Python 语法要点

- `json.loads(f.read_text())` — 读取并解析（JS: `JSON.parse(fs.readFileSync())`）
- `task.get("owner")` — 安全取值，不存在返回 None
- `messages.insert(0, msg)` — 列表头部插入（JS: `messages.unshift()`）
