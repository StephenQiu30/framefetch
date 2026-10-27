# 生产部署

本计划落实独立开发／生产环境与 `docker-compose-prod.yml` 生产入口。产品边界沿用[产品定位](../design/01-产品定位与边界.md)，技术约束见[总体架构](../design/02-总体架构.md#部署)和[可靠性与运行](../design/12-可靠性与运行.md#发布)，操作命令见[项目 README](../../README.md#平台身份与升级)。

## 工作包

| 工作包 | 状态 | 交付与证据 |
| --- | --- | --- |
| 环境隔离 | 完成 | `.env` 保留本地开发；生产显式加载 `.env.prod` 与共享／生产两份 Compose；已有环境文件不覆盖 |
| 生产覆盖配置 | 完成 | 固定 production 与前端 runtime；移除源码监听；必填密钥校验；清空仅供本地浏览器使用的存储端点；限制 Squid 文件句柄上限 |
| 缺失基础环境 | 完成 | PostgreSQL、RabbitMQ、Redis、MinIO；只在 Docker 宿主网关发布基础服务端口；Temporal 独立部署，使用 PostgreSQL 持久化与独立数据库账号 |
| HTTPS 入口 | 完成 | Nginx 代理 Web、任务 WebSocket 与公开存储接口；IP 证书、续期定时器与 Nginx 重新加载钩子；续期演练通过 |
| 正式链路验证 | 完成 | HTTPS 登录、Secure／HttpOnly Cookie、认证 WebSocket、文档分片上传、后台验证与解析正文读取；测试文档已删除 |

## 已验证环境

- 线上验证使用代码基线 `8c185a09ea670cda3d1af6ab46acef78a10654d6`，叠加本计划对应的部署配置；部署配置的交付版本通过 Git 历史追溯。
- 目标为全新 OpenCloudOS 9.6 x86_64、4 vCPU、约 3.5 GiB 内存；Docker Engine 29.7.2、Compose 5.4.0；构建期间增加 4 GiB 交换空间。
- 后端、前端 runtime 与 MinIO 镜像在目标架构实际构建；API、前端、Runner、出口代理、PO Token 服务及常驻基础服务通过各自健康检查；迁移与初始化作业退出状态为 0。worker 没有容器健康探针，其文档处理链通过正式接口实际验证。
- MinIO 公共固定镜像在 Docker Hub、Quay 均拉取失败；[基础环境 Dockerfile](../../infrastructure/minio/Dockerfile)固定官方源码 `9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a`，并从该模块锁定依赖构建 `mc`。不引入其他存储实现。
- 构建遇到依赖下载中断。损坏的单包缓存已清理；Python 锁文件哈希校验保持开启。Chromium 使用经完整 ZIP 检查与传输前后 SHA-256 比对的官方安装包缓存；没有修改业务源码、依赖版本或关闭 TLS 校验。临时构建代理和安装包服务器在验证后停止，业务运行不依赖本机连接。

## 实际验证

| 验证 | 结果与范围 |
| --- | --- |
| Compose 与出口回归 | 56 项相关测试通过，覆盖生产环境独立读取、runtime 与禁用监听、文件句柄限制、缺失配置拒绝、身份令牌注入范围、MinIO 固定源码、存储就绪与 CORS |
| 静态检查 | 新增测试 Ruff 检查与格式通过；开发、基础设施和生产 Compose 可解析；文档链接与锚点检查通过 |
| 线上登录 | 指定邮箱的首管理员通过应用初始化函数创建；正式 HTTPS 登录成功，Cookie 具有 Secure 与 HttpOnly 属性 |
| WebSocket | 使用正式 Web 会话连接生产 `wss` 任务通道并收到 `hello`；宿主代理仅信任实际 Docker 网关的精确地址 |
| 文档完整链 | 创建临时 TXT 导入，通过公开 HTTPS 存储接口和 Web 上传代理写入同一分片；完成上传后由后台 Worker 处理至 ready，读取到正确正文；删除文档并确认列表为空，验证会话正常退出 |
| HTTPS 续期 | Certbot `renew --dry-run` 成功；定时器每天检查两次，成功续期后校验并重新加载 Nginx |

## 运行与维护

- 业务工作目录为服务器 `/opt/framefetch`；生产操作固定使用 `--env-file .env.prod -f docker-compose.yml -f docker-compose-prod.yml`，已有镜像可用 `up -d --no-build --wait` 启动。
- 基础环境由 `docker-compose-env.yml` 管理。先等待 PostgreSQL、RabbitMQ、Redis、MinIO 常驻服务，再分别运行初始化作业，直接检查其退出状态；避免将一次性作业作为常驻服务等待。
- Temporal 位于服务器 `/opt/framefetch-infrastructure`，采用官方 server 1.29.1；auto-setup 镜像只用于显式 schema 初始化，不作为生产服务器进程。
- 生产环境文件、基础设施凭据和证书私钥仅保存在目标服务器的私有目录，不进入 Git。生产密钥保持稳定；后续更新不得用本机环境文件覆盖。
- Web 与存储 HTTPS 入口关闭请求访问日志，避免记录预签名存储查询参数；服务日志中的生产 Secret 值检查未发现匹配。
- 重建镜像需要可访问固定镜像源与依赖源；当前运行与重启使用已构建镜像，不依赖临时构建通道。源代码升级仍需按发布规则重新构建与验证。

## 验收边界

- AI Worker、模型授权与宿主 CLI 登录未配置，AI 分析开关保持关闭；没有复制本机 CLI 认证目录。
- Chrome 平台身份与固定海外住宅出口未配置；匿名国内线路不等于已取得住宅出口，也不证明任何平台的真实完整下载成功。
- SMTP 未配置，邮件注册关闭；已初始化的管理员可以登录。
- 未执行真实平台下载、AI 生成、跨端文件保存或数据库备份恢复演练；核心服务健康与文档导入不能替代这些验收。
