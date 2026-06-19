# MCP (Model Context Protocol) 速查

## 工具命名规范

```
mcp__{服务器名}__{工具名}
mcp__github__create_pr
mcp__slack__send_message
```

## MCPClient

```python
class MCPClient:
    def __init__(self, name, config):
        self.name = name
        self.tools = []
    def discover_tools(self): ...
    def call_tool(self, tool_name, args): ...
```

## 动态工具池组装

```python
def assemble_tool_pool():
    tools = list(BUILTIN_TOOLS)
    handlers = dict(BUILTIN_HANDLERS)
    for server_name, client in mcp_clients.items():
        for tool_def in client.tools:
            prefixed = f"mcp__{normalize(server)}__{normalize(tool)}"
            tools.append({"name": prefixed, ...})
            # 闭包捕获：默认参数避免 late-binding
            handlers[prefixed] = lambda *, c=client, t=tool_def["name"], **kw: c.call_tool(t, kw)
    return tools, handlers
```

## 闭包陷阱

```python
# ❌ 错误：所有 lambda 共享同一个 client
for client in clients:
    handlers[name] = lambda **kw: client.call_tool(kw)

# ✅ 正确：用默认参数捕获当前值
for client in clients:
    handlers[name] = lambda *, c=client, **kw: c.call_tool(kw)
```

## Python 语法要点

- `lambda *, c=val, **kw: ...` — 关键字参数 + 默认值捕获
- `re.sub('_', name)` — 正则替换（JS: `name.replace(/re/g, '_')`）
- `dict(other)` — 浅拷贝字典（JS: `{...other}`）
