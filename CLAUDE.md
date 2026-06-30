# 项目约束规则

- 任何时候都不要 `npm i hyperframes`，本地已经安装了 hyperframes 引擎，直接通过 `npx hyperframes [...]` 运行。
- 安装任何依赖前都需要经过我的审批，不要自动静默安装。
- 完成阶段性编码工作后，**一定不能**自动执行 `npx hyperframes render ... `，我需要先 preview，只有审查效果满意后，我命令你 render，才能执行渲染。
- 如果需要关于 claude code 完整、真实的源码，参考该项目 `D:\1_code-space\workspace_github\claude-code-sourcemap`
  - **重要**：不要一上来就蒙头全量扫描源码，优先阅读以下文件作为指南，然后再阅读具体代码
    - 1. `D:\1_code-space\workspace_github\claude-code-sourcemap\README.md`
    - 2. `D:\1_code-space\workspace_github\claude-code-sourcemap\STUDY-GUIDE.md`
    - 3. `D:\1_code-space\workspace_github\claude-code-sourcemap\learning-records\*`
    - 4. `D:\1_code-space\workspace_github\claude-code-sourcemap\lessons\*`
    - 5. `D:\1_code-space\workspace_github\claude-code-sourcemap\reference\*`
