# Force Push 冲突解决方案

当多人协作同一分支，有人执行 `git push --force` 后，其他协作者可能遇到问题。本文档总结两种常见场景及解决方案。

---

## 场景一：对方有你的提交

### 背景

```
你的操作前：
main:    A -- B -- C
learn:   A -- B -- C -- D -- E -- F (origin/learn)

对方本地：
learn:   A -- B -- C -- D -- E -- F -- G -- H (未push)

你 rebase + force push 后：
main:    A -- B -- C -- X -- Y -- Z (upstream/main 最新)
learn:   A -- B -- C -- X -- Y -- Z -- D' -- E' -- F' (你force push后的)

对方本地：
learn:   A -- B -- C -- D -- E -- F -- G -- H (旧历史，已不存在于远程)
```

### 问题

- `git push` 失败：远程历史和本地不一致
- `git pull` 出现合并冲突或重复提交，历史混乱

### 解决方案

```bash
# 1. 备份对方的工作
git checkout -b my-work-backup

# 2. 拉取你 force push 后的最新 learn
git fetch origin
git checkout learn
git reset --hard origin/learn

# 3. 把对方的提交 cherry-pick 过来
git cherry-pick G H

# 4. 如果有冲突，解决后继续
git cherry-pick --continue

# 5. 推送
git push origin learn
```

**核心思路**：对方的 `G-H` 基于旧的 `D-E-F`，需要基于新的 `D'-E'-F'` 重新应用。

---

## 场景二：对方没有你的提交

### 背景

```
你 force push 前：
main:         A -- B -- C (旧main)
origin/learn: A -- B -- C -- D -- E -- F (你的工作)

对方本地：
learn:        A -- B -- C -- G -- H (对方的工作，没有D-E-F)

你 force push 后：
main:         A -- B -- C -- X -- Y -- Z (新main)
origin/learn: A -- B -- C -- X -- Y -- Z -- D' -- E' -- F' (rebase后)

对方本地：
learn:        A -- B -- C -- G -- H (仍然基于旧的A-B-C)
```

### 问题

- `git push` 失败
- `git pull` 出现冲突，因为对方本地没有 `D-E-F`，历史不一致

### 解决方案

```bash
# 1. 备份对方的工作
git checkout -b my-work-backup

# 2. 拉取最新的 learn
git fetch origin
git checkout learn
git reset --hard origin/learn

# 3. 把对方的提交 cherry-pick 过来
git cherry-pick G H

# 4. 如果有冲突，解决后继续
git cherry-pick --continue

# 5. 推送
git push origin learn
```

**核心思路**：对方的 `G-H` 和你的 `D-E-F` 没有关系，只要把对方的工作重新放到新的历史上就行。

---

## 最简方案（适用于两种场景）

如果对方的改动不大，可以使用更简单的方式：

```bash
# 1. 备份（二选一）
git stash
# 或者手动保存改动的文件到其他位置

# 2. 直接重置到最新
git fetch origin
git checkout learn
git reset --hard origin/learn

# 3. 重新应用改动
git stash pop
# 或者手动把改动的文件复制回来

# 4. 解决可能的冲突
# 如果有冲突，编辑文件解决后：
git add .
git rebase --continue
# 或者如果是 stash pop 冲突：
git add .
git stash drop

# 5. 提交并推送
git add .
git commit -m "重新应用我的改动"
git push origin learn
```

---

## 预防措施

### 1. 使用 `--force-with-lease` 替代 `--force`

```bash
# 不安全：强制覆盖
git push origin learn --force

# 更安全：只有在远程分支没有新提交时才强制推送
git push origin learn --force-with-lease
```

`--force-with-lease` 会检查远程分支是否有你 fetch 之后的新提交，如果有则拒绝推送，防止覆盖别人的工作。

### 2. Force Push 前通知协作者

在执行 force push 前，通知所有协作者：
- 暂停在该分支上的推送操作
- 等待你完成 force push
- 然后按照上述方案重新同步

### 3. 使用 Rebase 前的检查

在执行 `git rebase` 前，先检查是否有其他人基于该分支工作：

```bash
# 查看最近的提交者
git shortlog -sn origin/learn

# 查看是否有未推送的提交（需要访问对方的本地仓库）
git log origin/learn..learn
```

---

## 总结

| 场景 | 对方情况 | 解决方案 |
|------|---------|---------|
| 场景一 | 有你的提交（D-E-F），并在此基础上做了 G-H | cherry-pick G-H 到新历史 |
| 场景二 | 没有你的提交，只有自己的 G-H | cherry-pick G-H 到新历史 |
| 最简方案 | 改动不大 | stash → reset --hard → stash pop |

**本质**：无论是哪种场景，核心都是把对方的提交（G-H）重新应用到新的历史上。区别只是 cherry-pick 还是 stash pop。
