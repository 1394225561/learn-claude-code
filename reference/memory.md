# Memory System 速查

## 三个子系统

| 子系统 | 时机 | 作用 |
|--------|------|------|
| Selection | 对话前 | LLM 选出相关记忆注入 |
| Extraction | 每轮后 | 提取用户偏好/项目事实 |
| Consolidation | 文件超阈值 | 合并去重 |

## 存储格式

```
.memory/
├── MEMORY.md              # 索引文件
├── user-preferences.md    # 记忆文件（YAML frontmatter）
└── project-config.md
```

```markdown
---
name: user-preferences
description: 用户喜欢简洁风格
type: user
---

用户偏好：代码风格简洁，不要过度注释。
```

## 核心函数

```python
def select_relevant_memories(messages):    # LLM 侧查询选出相关
def load_memories(selected):               # 读取并包装为 <relevant_memories>
def extract_memories(messages):            # 每轮后提取新记忆
def consolidate_memories():                # 超 10 个文件时合并
```

## Python 语法要点

- `f.write_text()` / `f.read_text()` — Path 便捷读写
- `text.split("---", 2)` — frontmatter 解析
