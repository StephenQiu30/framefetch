# 云端 Chrome 身份入口

职责与边界见[连接设计](../../docs/design/17-云端插件连接.md)，执行与验收见[计划](../../docs/plan/PLAN-云端插件协作.md)。这里提供宿主运行和 Nginx 模板，不包含密钥或公网配对下载。

1. 在 `/opt/framefetch/backend` 使用 Python 3.12 与 `uv sync --frozen --no-dev` 准备原生宿主虚拟环境。创建无登录用户 `framefetch-identity`，其 HOME 为 `/var/lib/framefetch-identity`；给予源码只读权限，单独赋予 `/var/lib/framefetch-identity` 和 `/opt/framefetch/.local-runtime/identity` 私有写权限。该目录需要现有 Git 工作区；设置仓库级 `safe.directory` 给此服务用户，避免不同所有者导致 Git 检查失败。
2. 用 `prepare_config(Path('/var/lib/framefetch-identity/identity.env'))` 生成宿主私有配置，目录／文件为 0700／0600。已有配置保留。安装 `framefetch-identity.service`，运行 `systemctl daemon-reload` 与 `systemctl enable --now framefetch-identity`。`run` 只监听回环并原子生成 Runner 专用 `runner.env`；容器仅加载该文件。
3. 查实际 Docker `host-gateway` 与 Squid uplink 子网，分别填入 HTTP 模板的 `DOCKER_HOST_GATEWAY`、`SQUID_UPLINK_CIDR`。填入 `extension_origin()` 的固定公开值到 WSS 模板的 `EXTENSION_ORIGIN`。只替换这三个占位符，保留 Nginx 的 `$http_*` 等变量。HTTP 模板放在 `http` 上下文，WSS 模板 include 到已有有效 TLS 的 443 server；`nginx -t` 成功才 reload。网络重建改变子网时需同步更新并验证，不使用 `0.0.0.0` 私有监听。
4. 本机从 `backend/` 执行 `uv run --frozen python -m app.workers.identity.cli install --env-file <独立私有身份文件> --server-url https://<服务地址>`。此模式只生成扩展，不注册本机服务或发布本机 Runner Bearer。经已有 SSH/SFTP 私有管理通道同步两端的 `COOKIE_SOURCE_PAIRING_KEY`，仅同步该字段，云端实际 Runner Bearer 不传到本机或扩展。已有本地配对需保留时，先准备其私有配置再安装；轮换需要同步两端。
5. 在日常登录的普通 Chrome 中重新加载主工作区 `extension/`。确认版本、服务目标与认证连接；用户自行登录目标平台。宿主 `check --env-file ...` 输出连接与版本，既不输出 Cookie，也不证明平台解析通过。
6. 先确认无在途任务，再按生产 Compose 重建必要 Runner。用正式 API 分别验证真实身份使用、X L3、YouTube 解析及完整文件。云端网络出口单独配置；WSS 不承担本机流量转发。

不要开放回环 `/status`、`/cookies`、`/yuanbao-parse`、`/identity-result`，也不要代理整个身份服务路径。缺少扩展、必要 Cookie 或有效出口时按真实失败报告。
