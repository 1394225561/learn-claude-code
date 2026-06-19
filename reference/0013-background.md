# Background Task 速查

## 核心模式

```python
background_tasks = {}     # 任务状态
background_results = {}   # 完成结果
background_lock = threading.Lock()

def start_background_task(block) -> str:
    bg_id = f"bg_{_bg_counter:04d}"
    def worker():
        result = execute_tool(block)
        with background_lock:
            background_tasks[bg_id]["status"] = "completed"
            background_results[bg_id] = result
    threading.Thread(target=worker, daemon=True).start()
    return bg_id  # 立即返回，不等结果
```

## 结果收集

```python
def collect_background_results():
    results = []
    with background_lock:
        for bg_id, result in list(background_results.items()):
            results.append(f"[{bg_id} completed]\n{result}")
            del background_results[bg_id]
    return results
```

## 慢操作判断

```python
SLOW_PATTERNS = ["install", "build", "compile", "test", "docker"]

def is_slow_operation(command: str) -> bool:
    return any(p in command.lower() for p in SLOW_PATTERNS)
```

## Python 语法要点

- `threading.Thread(target=fn, daemon=True)` — daemon 线程，主进程退出时自动终止
- `with lock:` — 上下文管理器自动获取/释放锁
- `threading.Lock()` — 线程安全互斥锁
