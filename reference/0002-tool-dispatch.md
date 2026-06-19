# Tool Dispatch 模式速查

## 核心模式：调度表

```python
TOOL_HANDLERS = {
    "bash": run_bash,
    "read_file": run_read,
    "write_file": run_write,
    "edit_file": run_edit,
    "glob": run_glob,
}

# 循环中
output = TOOL_HANDLERS[block.name](**block.input)
```

## 工具定义（JSON Schema）

```python
TOOLS = [{
    "name": "tool_name",
    "description": "What this tool does.",
    "input_schema": {
        "type": "object",
        "properties": {
            "param": {"type": "string"}
        },
        "required": ["param"],
    },
}]
```

## 新增工具步骤

1. 写一个处理函数：`def run_my_tool(param: str) -> str: ...`
2. 注册到调度表：`TOOL_HANDLERS["my_tool"] = run_my_tool`
3. 定义 schema：加入 `TOOLS` 列表
4. **循环代码不变**

## 安全路径检查

```python
def safe_path(p: str) -> Path:
    path = (WORKDIR / p).resolve()
    if not path.is_relative_to(WORKDIR.resolve()):
        raise ValueError("Path outside workspace")
    return path
```

## Python 语法要点

- `**dict` — 字典展开为关键字参数（类似 JS `...obj`）
- `dict.get(key)` — 安全取值，不存在返回 None
- `int | None` — Python 3.10+ 联合类型
- `Path / "sub"` — pathlib 路径拼接
