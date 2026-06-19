# Team Protocols 速查

## ProtocolState

```python
@dataclass
class ProtocolState:
    request_id: str       # 唯一标识
    type: str             # "shutdown" | "plan_approval"
    status: str           # pending | approved | rejected
    payload: str
    created_at: float = field(default_factory=time.time)
```

## 请求-响应匹配

```python
pending_requests: dict[str, ProtocolState] = {}

def match_response(response_type, request_id, approve):
    state = pending_requests.get(request_id)
    if not state: return
    # 类型验证
    if state.type == "shutdown" and response_type != "shutdown_response":
        return  # 类型不匹配
    state.status = "approved" if approve else "rejected"
```

## 两种协议

| 协议 | 请求 | 响应 |
|------|------|------|
| Shutdown | `shutdown_request` | `shutdown_response` |
| Plan Approval | `plan_submit` | `plan_approval` |

## Python 语法要点

- `field(default_factory=time.time)` — 每实例调用的默认值工厂
- `msg_type.endswith("_response")` — 字符串后缀检查
