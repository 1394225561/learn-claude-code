# 第 1 课完成：Agent Loop 核心概念

完成了第一课的教学设计。Agent Loop 是整个 Agent 架构的内核：一个 while 循环，模型调工具就继续，不调就停。关键洞察是"模型决策，harness 执行"——模型拥有决策权，harness 只是执行者。

这节课建立了三个核心概念：
1. Agent Loop 的控制流（stop_reason 检查）
2. 工具调用的生命周期（tool_use → 执行 → tool_result → 喂回）
3. 消息格式（user/assistant 角色的分工）

下一课应该是 Tool Dispatch（工具调度），从单一 bash 工具扩展到多工具系统。
