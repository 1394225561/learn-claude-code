# Skill Loading 速查

## 两级注入

| 阶段 | 内容 | Token 消耗 |
|------|------|-----------|
| 启动时 | 名字 + 描述（目录） | ~100/技能 |
| 按需加载 | 完整 SKILL.md | ~2000/技能 |

## 核心代码

```python
SKILL_REGISTRY: dict[str, dict] = {}

def _scan_skills():
    for skill_dir in sorted(SKILLS_DIR.iterdir()):
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists(): continue
        frontmatter, body = _parse_frontmatter(skill_file.read_text())
        SKILL_REGISTRY[skill_dir.name] = {
            "name": skill_dir.name,
            "description": frontmatter.get("description", ""),
            "path": str(skill_file),
        }

def load_skill(name: str) -> str:
    skill = SKILL_REGISTRY.get(name)
    if not skill: return f"Unknown skill: {name}"
    return Path(skill["path"]).read_text()
```

## SKILL.md 格式

```markdown
---
name: skill-name
description: 一句话描述
---

# 技能正文
...
```

## Python 语法要点

- `text.split("---", 2)` — `maxsplit` 限制分割次数
- `dict[str, dict]` — Python 3.9+ 泛型
- `sorted(dir.iterdir())` — 排序目录条目
