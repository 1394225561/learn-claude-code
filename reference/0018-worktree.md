# Worktree Isolation 速查

## 核心命令

```python
def create_worktree(name, task_id=""):
    validate_worktree_name(name)  # 正则验证
    path = WORKTREE_DIR / name
    ok, result = run_git(["worktree", "add", str(path), "-b", f"wt/{name}", "HEAD"])
    if task_id:
        bind_task_to_worktree(task_id, name)
    log_event("create", name, task_id)
```

## 安全清理

```python
def remove_worktree(name, force=False):
    if not force:
        ok, output = run_git(["-C", str(path), "status", "--porcelain"])
        if output.strip():
            return False, "Has uncommitted changes"
    run_git(["worktree", "remove", str(path)])
    return True, "Removed"
```

## 名称验证

```python
VALID_NAME = re.compile(r'^[A-Za-z0-9._-]{1,64}$')
```

## Python 语法要点

- `re.compile(r'pattern')` — 编译正则（JS 用字面量 `/pattern/`）
- `subprocess.run(["git"] + args, ...)` — 执行外部命令
- `tuple[bool, str]` — 元组返回类型（JS 返回对象）
- `f"wt/{name}"` — f-string（JS: `` `wt/${name}` ``）
