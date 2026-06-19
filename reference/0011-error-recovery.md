# Error Recovery 速查

## 三种故障路径

| 故障 | 症状 | 恢复策略 |
|------|------|---------|
| 瞬时故障 | 429/529 | 指数退避 + 模型降级 |
| 输出截断 | `max_tokens` | 升级 token 上限 + 继续提示 |
| 上下文溢出 | `prompt_too_long` | 响应式压缩 |

## 指数退避

```python
delay = min(500 * (2 ** attempt), 32000)  # 500ms → 1s → 2s → 4s → 8s
delay += random.uniform(0, delay * 0.25)  # 抖动防雷群
```

## RecoveryState

```python
class RecoveryState:
    def __init__(self):
        self.consecutive_529 = 0
        self.current_model = PRIMARY_MODEL
        self.max_tokens_recoveries = 0
        self.has_compacted = False
```

## 恢复流程

```
429/529 → 指数退避重试 → 3次529 → 切换备用模型
max_tokens → 8K→64K → 继续提示(最多3次)
prompt_too_long → reactive_compact → 重试
```

## Python 语法要点

- `class X:` + `self` — Python 类的显式 self（JS 用隐式 this）
- `lambda mt=val: ...` — 默认参数捕获当前值
- `random.uniform(a, b)` — 随机浮点数（JS: `Math.random() * (b-a) + a`）
- `type(e).__name__` — 获取异常类名（JS: `e.constructor.name`）
- `time.sleep(s)` — 阻塞睡眠（JS 无内置阻塞 sleep）
