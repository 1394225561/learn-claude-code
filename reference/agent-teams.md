# Agent Teams 速查

## 架构

```
Lead Agent (主循环)
  ├── Teammate "Alice" (线程)
  ├── Teammate "Bob" (线程)
  └── Teammate "Carol" (线程)
        ↕
    MessageBus (JSONL 文件邮箱)
```

## MessageBus

```python
class MessageBus:
    def send(self, from_agent, to_agent, content, msg_type="message"):
        msg = {"from": from_agent, "to": to_agent,
               "type": msg_type, "content": content,
               "timestamp": time.time()}
        inbox = MAILBOX_DIR / f"{to_agent}.jsonl"
        with open(inbox, "a") as f:
            f.write(json.dumps(msg) + "\n")

    def read_inbox(self, agent):
        inbox = MAILBOX_DIR / f"{agent}.jsonl"
        if not inbox.exists(): return []
        msgs = [json.loads(line) for line in inbox.read_text().splitlines()]
        inbox.unlink()  # 破坏性读取
        return msgs
```

## 关键设计

- JSONL 追加写入（每行一条消息）
- 破坏性读取（读完删除，防止重复处理）
- 文件可持久化、可跨进程、可人工检查

## Python 语法要点

- `path.unlink()` — 删除文件（JS: `fs.unlinkSync()`）
- `path / f"file.jsonl"` — Path 拼接
- `lambda to, content: (side_effect, "val")[1]` — lambda 中执行副作用的技巧
