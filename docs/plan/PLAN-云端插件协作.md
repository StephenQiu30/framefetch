# 云端插件协作执行计划

> 按工作包依次实施，以回归测试验证行为，分别记录自动化、线上身份连接与真实平台验收。

**目标：** 同一 Chrome 插件可选择本地或云端身份服务，补齐 X 的真实浏览器回退。

**架构：** 复用既有双向配对协议，云端宿主身份服务经精确 WSS 入口接收本机 Chrome 材料，Runner 仅经私有认证入口获取。Cookie 身份与独立网络出口解耦。

**技术栈：** Python/FastAPI、Playwright、Chrome MV3、Nginx、systemd、Docker Compose。

**规格：** [需求](../prd/PRD-云端插件协作.md)、[设计](../design/17-云端插件连接.md)。

## 全局约束

- 保留现有配对协议、内容范围与材料生命周期；只修改本任务文件。
- Cookie、配对密钥、Bearer 不进入业务 JSON、日志、数据库或队列；配对密钥不进入容器。
- 本地与云端模式使用同一份唯一目标配置；生成文件只经生成命令更新。
- 不将本机代理转发给云端，不把连接成功或夹具通过当作平台验收。
- 无新接口契约、无数据库变更；不重启本机基础服务，不覆盖现有环境配置。

## 重点审查

1. X 推荐、引用、回复混入响应时必须精确匹配源推文。
2. 多视频显式序号、未知公开性和受保护内容必须拒绝误选或越界。
3. 云端地址携带账号、查询串、路径或明文协议时必须拒绝生成。
4. 错误 Origin、错误配对和第二个连接不能取得 Cookie 或取代当前连接。
5. 服务重启、断连和失败任务后身份材料与浏览器租约必须清理。

## 工作包 1：X 页面解析器

**文件：** 新增 `backend/app/workers/runner/engine/browser/x.py`、`backend/tests/unit/workers/runner/test_x_browser.py`；修改 `engine/layers/browser.py`、`engine/browser/intercept.py` 与相邻浏览器测试。

**接口：** `parse_response(payload, expected_id, selected_index=None) -> ResolvedMedia`；BrowserLayer 从源 URL 提取 status ID 和视频序号；PageResponses 仅接收明确的 HTTPS X/Twitter 推文响应。

- [x] 先补失败测试：缺失 X 回退、精确推文 ID、多视频序号、作者公开证明、受限内容、MP4/HLS 与畸形数据。
- [x] 运行 `uv run --frozen pytest -q tests/unit/workers/runner/test_x_browser.py`，观察缺失解析器失败。
- [x] 实现纯响应解析与注册，复用媒体探测和现有清理；不构造签名 API 请求。
- [x] 重跑上述测试及 `test_browser_oracle.py`、`test_g2_browser.py`；预期全部通过。

## 工作包 2：插件服务目标与 Linux 运行

**文件：** 修改 `backend/app/workers/identity/{extension,cli}.py`、`extension/{background,popup}.js`、manifest 模板及对应测试；配对协议原样复用。

**接口：** `install_extension(settings, server_url=None)` 生成唯一 `endpoint`；CLI `install --server-url https://origin` 只生成云端扩展，不启动本机服务；Linux 支持 `run/check`。

- [x] 先补失败测试：HTTPS origin 校验、精确权限、旧本地使用与云端模式不启动本机服务。
- [x] 运行身份单元测试和 `node --test extension/*.test.cjs`，观察对应失败。
- [x] 实现配置生成、唯一连接目标及面板显示，保留双向配对与重连。
- [x] 重跑身份、Runner 身份测试与扩展测试；预期通过，Windows 专属用例在 macOS 保留显式跳过。

## 工作包 3：宿主入口与部署

**文件：** 新增 `infrastructure/identity/` 的 systemd、Nginx 模板与专用运行说明，更新根 README、关联设计与本计划。

**接口：** 公网仅 `/identity/extension`，私有 Docker 网关仅既有三个 POST；云端宿主 `run --env-file` 生成 Runner Bearer 文件。

- [x] 校验模板的实际配置、精确路由、无访问日志与连接限额；运行身份路由认证回归。
- [x] 检查开发／生产／基础设施 Compose，文档检查与最小充分后端、扩展回归。
- [x] 经已有 SSH 发布必要文件，保留现有密钥与数据，验证 Nginx/systemd、WSS 认证和 Runner 私有入口。
- [x] 生成私有配对配置并重新加载真实 Chrome 扩展，验证连接与实际按需取身份。面板服务目标已通过 Node 行为测试；真实面板视觉检查未完成，避免干扰用户正在使用的 Chrome。
- [x] 用正式 API 对原 X、YouTube 任务重新解析，确认真实 identity_used 与层级，并记录失败。
- [ ] 配置独立海外出口后，完成 X L3 与 YouTube 的成功解析及完整文件验收；用户确认目前暂无代理，此项阻塞。

## 执行记录

### 已完成实现与发布

- X 解析器、明确的第一方响应入口、精确推文与视频选择、作者公开证明、可见性包装限制、clear MP4 与实际格式探测均已实现。独立审查发现并修复 TweetDetail 包装深度和包装限制丢失两个问题；新增失败测试复现后通过。无实际格式探测证据时不以页面播放猜测 codecs/fps。
- 扩展 1.5.0 使用唯一 endpoint 配置；本地 WS 与云端 WSS 均受配置校验及 CSP 限定，保留原有双向认证、来源校验和断线重连。云端安装不启动本机服务、不发布本机 Runner Bearer。
- 线上原生 Python 3.12.13 与锁定依赖环境通过导入和 uv 101 包一致性检查。GitHub 的固定 yt-dlp 源下载超时，复用了现有已锁定镜像中的相同 yt-dlp 安装，随后 `uv sync --frozen --no-dev` 完成一致性检查；未改依赖或关闭校验。
- 云端身份进程使用独立无登录用户和 systemd，回环监听；Nginx 公网精确 WSS 入口与实际 Docker 网关私有三 POST 已安装。Runner 使用生产 Compose 单服务重建；更新前在途解析／下载数均为 0。
- Runner 镜像基于既有已验证镜像叠加五个本次 Python 文件，没有重新执行完整依赖／浏览器镜像构建。旧镜像标签 `framefetch:before-cloud-identity` 与 `/root/.framefetch-deploy/cloud-identity-backup` 保留可回滚制品；生产环境配置、业务数据及原有密钥未覆盖。

### 真实线上证据

| 检查 | 结果与覆盖限制 |
| --- | --- |
| Chrome 扩展 | 日常 Profile 通过扩展管理页重新加载到 1.5.0；云端 `check` 为 connected=true / version=1.5.0，不依赖本机 cookie-source |
| 公网边界 | 有效 TLS 与固定扩展 Origin 可收到 WSS challenge；错误 Origin 403；带查询参数的入口、公开身份 Cookie／状态路径均 404 |
| 身份服务重启 | systemd 重启后在 45 秒检查窗口内自动恢复 connected=true / version=1.5.0；未验证本机睡眠或 Chrome 完整重启 |
| Runner 私有身份 | 从线上 Runner 经受控 Squid 与私有入口分别取得 X、YouTube 的实际 Chrome 身份，探针终止后 cleanup；只输出材料可用，不输出 Cookie 或摘要 |
| 正式 X 重解析 | 原任务 `4c0326a8-23bd-4ea1-85f9-ab553bf1956b` 经正式 refresh API 返回 202；最终 L3 / x:browser / identity_used=true，失败 challenge / page_navigation_failed；不再是 browser_parser_missing |
| 正式 YouTube 重解析 | 原任务 `1a2920d3-f489-4e96-bb66-85006b4b6f43` 经正式 refresh API 返回 202；最终 L3 / youtube:wpc:mweb / identity_used=true，失败 network_blocked |
| 海外网络 | 两任务出口 IP 均未观测；既有云端上游无有效监听，用户确认暂无独立代理。未转发本机代理，未声称下载成功 |

### 自动化与剩余验收

完整后端回归 3875 passed / 5 skipped；扩展 48 项通过。Ruff、901 个 Python 文件格式、600 个应用文件 mypy、开发／生产／基础环境 Compose 与 47 份文档检查通过。跳过项为隔离 MinIO 上传边界与 Windows 原生 ACL／junction，均不计为通过。五个运行时源码的本地／远程 SHA-256 一致；线上 API、Runner、Squid 与 PO Token 服务健康，worker 运行中且没有健康探针。真实完整文件、Chrome 睡眠唤醒／重启组合和面板视觉检查仍未完成。
