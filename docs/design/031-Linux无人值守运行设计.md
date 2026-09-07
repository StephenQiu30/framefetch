# 031 Linux 无人值守运行设计

- 状态：Proposed；目标环境已由用户确认为 Linux，无桌面登录；尚未实现。
- 核查日期：2026-09-07；代码基线：`15dc07fb`。
- 前置能力：[030 运行故障隔离与恢复](030-运行故障隔离与恢复设计.md)。030 不代表本设计已经完成。

## 目标与可行性

在上游协议不变、授权仍有效、持久存储可用的条件下，Linux 主机或容器重启后应自动恢复服务和任务，不需要登录桌面、打开 Chrome、重新导出 Cookie 或修改适配代码。首次部署和首次授权允许一次性配置；重启不能成为重新配置的触发器。

| 情况 | 处理方式 | 能否无人值守 |
| --- | --- | --- |
| 应用进程退出、主机重启、临时目录丢失 | 固定镜像、系统服务自启、持久状态恢复、重新领取操作凭据 | 可以实现，需 Linux 冷启动实测 |
| 有效授权因进程内存清空而丢失 | 加密持久化授权，启动后重新签发短期操作租约 | 可以实现，当前尚无独立服务端来源 |
| 支持官方续期的 access token 过期 | 持久保存 refresh token，有界刷新与原子轮换 | 可以实现，但必须有平台对应能力 |
| 普通 Cookie 失效、授权撤销、平台要求重新验证 | 停止使用该凭据并提示重新授权；恢复后再准入 | 不能承诺自动续期或永久有效 |
| 上游解析协议变化 | 候选版本构建、契约测试、平台 canary、灰度与回滚 | 可自动检测和验证，修复仍可能需要开发 |
| 单主机或持久存储损坏 | 副本、备份恢复和跨主机执行归属 | 属于下一阶段 HA，容器自启不能替代 |

## 已确认的项目阻碍

1. [会话装配](../../backend/app/runner/provider_sessions.py)的生产来源只有宿主文件队列客户端；[代理](../../backend/app/runner/provider_cookie_agent.py)依赖 macOS LaunchAgent。
2. [来源适配](../../backend/app/runner/provider_session_source.py)读取 Chrome 或临时元宝浏览器状态；[策略](../../backend/app/runner/provider_session_policy.py)中的八个平台依赖 Chrome，视频号另依赖动态浏览器状态。代码中声明支持不等于当前 Linux 实测通过。
3. [生产 Compose](../../docker-compose-prod.yml)仍把宿主 `Library/Caches/FrameFetch/provider-cookie-agent` 挂入受控 Runner。设置容器重启策略不会产生 Linux 会话代理，也不会延长凭据寿命。
4. 既有 PostgreSQL、Outbox、lease/heartbeat 和幂等是恢复基础；仍需验证强杀、断电与重试预算。当前 Runner 执行状态和共享工作目录不能直接跨主机复制扩容。
5. [029 授权获取设计](029-付费内容识别与授权获取设计.md)描述了官方 Connector 的准入条件，当前没有可以替代全部平台的通用官方媒体导出 Connector。

## 目标架构决策

### 独立的授权生命周期

生产授权由服务端凭据管理能力负责；普通 API、下载 Worker、匿名 Runner 不读取凭据。复用现有 PostgreSQL 保存最小授权元数据与记录绑定的密文，使用独立的凭据加密密钥，不复用 AI Provider Key 的加密用途。密钥通过部署 Secret 注入，并纳入可恢复性验收。数据库角色限制在所需凭据表；具体 SQL、角色与服务装配在实现批次中提交。

授权记录至少绑定 Provider、账号主体、授权范围、凭据版本、来源类型、到期信息和撤销状态。不同账号或授权范围变更生成新版本；不得仅沿用当前固定 `browser` 标识，让旧任务静默切换身份。平台没有可信到期字段时记录为未知，由实际能力探针更新状态，不虚构长期有效期。

保留单 Provider Runner 与操作级 tmpfs。Runner 通过有界、认证且绑定请求的凭据租约取得所需最小集合；数据库和加密主密钥不进入 Runner。操作结束销毁明文。首次授权通过独立的管理通道配置，不加入 inspection/download 普通 JSON。具体管理协议与凭据来源必须随实现、测试一起落地，不提前宣称存在可用接口。

只有经平台核实支持续期的来源才实现自动刷新；刷新采用单凭据互斥、版本比较后原子写入、超时与有限重试。无续期协议的 Cookie 只能恢复仍有效的授权，不能通过“保活”保证其永不过期。授权撤销后停止刷新，错误不被无限重试掩盖。

### 按能力迁移平台

公开无凭据来源首先进行 Linux 实测。Chrome 来源的八个平台逐一核实可用授权来源、服务端出口绑定、恢复方式与有效期；通过门禁后才列为无人值守支持。视频号的元宝动态状态不能当成普通 Cookie Secret 迁移，必须单独验证可用服务端接口；未具备时准确显示能力限制，不把桌面助手包装成 Linux 原生服务。

官方 OAuth 解决身份与 API scope，不自动提供原始媒体下载接口。官方 Connector 必须验证实际媒体导出能力、资产与账号绑定，不能仅凭登录成功宣告下载支持。已有内容授权与网络隔离规则继续适用。

### 启动与执行恢复

Linux 以系统级服务启动 Docker，业务镜像与依赖版本固定，启动不执行 `pip install -U`、拉取最新解析器或动态打补丁。生产入口使用现有 `docker-compose-prod.yml`；只有具备相应来源的 Provider 才启用，不创建另一套平行部署目录。

所有持久状态须独立于容器可写层。临时 Cookie 与执行缓存允许丢失，任务从 PostgreSQL 恢复；过期媒体直链通过已有语义计划重新解析。基础设施短暂不可用采用有界重连与退避，业务失败和基础设施中断分别计量。重复投递必须收敛到唯一逻辑结果；可以重新执行下载，不能据此宣称字节级断点续传或严格 exactly-once 执行。

启用 AI 分析时也检查其登录依赖：当前 Linux systemd user service 不等于已验证的开机无人登录启动。企业生产优先验证已接入的服务端 Key 来源；若选择用户级 CLI 授权，须另行证明启动与授权生命周期，不能只验收下载链路后宣称全系统通过。

### 发布工作流与高并发

沿用现有 GitHub Actions，依次执行契约与恢复测试、Linux 运行测试、候选镜像构建、持有最小凭据的目标环境 canary、灰度发布及失败回滚。真实平台凭据不进入 fork PR 或不可信候选代码；无凭据 CI 不把跳过的真实平台验收算作成功。此设计不创建定时任务或自动发布授权。

先完成恢复闭环，再按平台设置并发额度、任务公平调度和失败隔离。持久执行归属与制品交付验证之前，不直接给当前有内存状态的 Runner 增加随机负载均衡。Kubernetes 或新的工作流引擎不是本阶段前提，也不能修复失效的平台会话。

## 外部依据

- [yt-dlp 官方支持列表](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)：通过 GitHub 插件核查，内置 extractor 不保证站点持续可用，需实际验证。
- [yt-dlp FAQ](https://github.com/yt-dlp/yt-dlp/wiki/FAQ)：媒体请求可能绑定相同 IP、Cookie 和请求头，因此跨机器复制解析结果不足以证明可用。GitHub 插件不支持该 wiki URL，使用网页核查。
- [Google 服务端 OAuth 文档](https://developers.google.com/identity/protocols/oauth2/web-server)：令牌需安全持久保存；refresh token 可续期 access token，但自身仍可能失效或撤销。
- [YouTube API 政策](https://developers.google.com/youtube/terms/developer-policies)：OAuth 授权不能被推导为通用媒体下载授权，媒体获取需单独核实。
- [Docker 自动启动文档](https://docs.docker.com/engine/containers/start-containers-automatically/)：重启策略负责容器生命周期；不能替代应用凭据与任务恢复。

上述链接核查于 2026-09-07。架构与交付批次是本项目的设计建议，不是上游提供的现成功能。
