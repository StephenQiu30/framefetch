# video-web

`video-web` 是万能视频下载器 MVP 的 Web 仓库。

## 当前状态

- MVP 只覆盖：粘贴单个公开视频链接、选择分辨率、查看任务状态和获取文件。
- 4 份 Web Design、4 份对应 PRD 已 Accepted，4 份对应 Plan 已 Ready。
- Web 固定消费 PostgreSQL/RabbitMQ/MinIO 后端架构提供的 FastAPI/OpenAPI 契约，不提供基础设施选择。
- 当前未开始应用实现，也没有 Acceptance 结果；Plan Ready 不代表已授权实施。
- 当前没有应用源码、依赖、测试、schema、fixture 或业务运行配置。
- 仓库只保留项目治理文件与文档分类骨架。

## 重新设计门禁

后续工作固定遵循：

`Design → PRD → Plan → Acceptance`

当前 Design、PRD、Plan 与各阶段 Acceptance 定义已完成。只有用户再次明确要求实现后才能创建应用代码；实现前不得改动验收标准，实现后只在对应 Acceptance 中填写证据与结论。

## 项目规范

本仓库按 [stephen-codex](https://github.com/StephenQiu30/stephen-codex) 当前 `main` 整理：

- `AGENTS.md`：长期协作、交付与 Git 规则。
- `AGENTS.local.md`：本仓库边界与重新设计门禁。
- `WORKFLOW.md`：Symphony/Linear 编排契约。
- `.codex/`：Agent 角色与核心流程。
- `docs/`：正式文档分类骨架。
- `.github/`：PR 模板与基础 CI。

文档入口见 [`docs/README.md`](docs/README.md)。当前不提供安装、运行或部署命令。
