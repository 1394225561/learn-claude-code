# Permission System 速查

## 三道门

```
工具调用请求
    │
    ▼
Gate 1: 硬拒绝（黑名单）→ 直接拒绝
    │ 通过
    ▼
Gate 2: 规则匹配 → 需要用户确认
    │ 不匹配
    ▼
Gate 3: 用户确认 → y/N
    │ 确认
    ▼
  执行工具
```

## 核心代码

```python
DENY_LIST = ["rm -rf /", "sudo rm", "dd if=", "> /dev/"]

RULES = [
    {"name": "write_outside", "desc": "写入工作目录之外",
     "check": lambda args: not is_safe_path(args.get("path", ""))},
    {"name": "dangerous_bash", "desc": "危险的 bash 命令",
     "check": lambda args: any(kw in args.get("command", "") for kw in ["rm ", "sudo"])},
]

def check_permission(block) -> bool:
    for keyword in DENY_LIST:                    # Gate 1
        if keyword in str(block.input):
            return False
    for rule in RULES:                           # Gate 2
        if rule["check"](block.input):
            answer = input(f"⚠️ {rule['desc']}。允许? [y/N] ")  # Gate 3
            if answer.lower() != "y":
                return False
    return True
```

## Python 语法要点

- `lambda args: expr` — 单表达式 lambda（JS 箭头函数可多行）
- `any(... for x in list)` — 生成器 + any()（JS: `list.some()`）
- `input("prompt")` — 同步阻塞读取 stdin
