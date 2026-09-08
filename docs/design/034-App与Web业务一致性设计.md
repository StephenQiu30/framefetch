# App 与 Web 业务一致性设计

认证采用与 App 一致的标题、邮箱域名校验和密码 Unicode 字符长度 8–128。密码显示按钮复用 InputGroup，禁止新增 UI 框架。跨端业务对照见 App 020 四件套，原生权限和文件保存交互保留。

认证密码长度按 Unicode 字符校验，不使用 HTML maxLength 截断 UTF-16 字符。注册邮箱变化清空验证码；发码与注册互斥。既有用户的 HttpOnly Cookie 与 App 原生 Bearer 会话规则不变。
