# App 与 Web 业务一致性验收

2026-09-08。Web 认证规则与文案已同步，密码显示按钮复用现有 InputGroup；新增 AI 服务统一业务名称。

逐页对照和 App 独立证据见相邻 `video-app/docs/acceptance/020-App与Web全业务一致性验收.md`。本次没有修改服务端业务接口或数据库结构。

Web lint、format、TypeScript、235 项测试和 production build 通过。5 次 axe 检查均为 0 violations、0 incomplete；390px 账户页面 document.scrollWidth 等于 innerWidth，注册深浅主题和桌面登录截图已人工查看。实际浏览器使用隔离 API、SMTP 捕获器及合成账户；登录、注册、账户页面验证桌面与 390px 深浅主题，并执行 axe 检查。生产 Web/API 容器未重新构建，真实 SMTP 收件和媒体/AI 处理不属于本次证据。
