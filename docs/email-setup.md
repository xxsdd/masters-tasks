# 主人的任务：启用邮箱验证码与密码找回

## 当前状态

代码和页面已准备好，实际发送邮件需要 Resend 账号、API 密钥以及一个你能管理 DNS 的域名。暂时没有这些配置时，网站会明确显示邮箱功能尚未启用，仍允许原有用户名和密码登录。

## 配置步骤

1. 在 https://resend.com 创建账号，在 Domains 中添加自己的域名，例如 `mail.yourdomain.com`。按照控制台要求将 DNS 记录添加到域名服务商，等待显示 Verified。`masters-tasks.vercel.app` 是 Vercel 提供的地址，不能拿它来验证自己的发信域名；网站可以继续使用这个网址。
2. 在 Resend 的 API Keys 中创建一个用于发送邮件的密钥，权限尽量限制到对应域名。不要把密钥发进聊天或提交到 Git。
3. 打开 Vercel 的 `masters-tasks` 项目 → Settings → Environment Variables，为 Production 添加：

   | 变量 | 值 |
   | --- | --- |
   | `RESEND_API_KEY` | Resend 生成的真实 API 密钥 |
   | `EMAIL_FROM` | `主人的任务 <noreply@mail.yourdomain.com>`，替换为自己的已验证域名 |
   | `EMAIL_CODE_SECRET` | 推荐填写单独生成的至少 32 字节随机密钥 |

4. 重新部署 Production，让新配置生效。数据库迁移应先完成，`npm run db:migrate` 可重复执行且不清空现有数据。
5. 使用自己的邮箱创建新账号并接收注册验证码；已有账号登录后，到「双人空间 → 账号与邮箱」输入当前密码并验证绑定邮箱。
6. 邮箱绑定后，每次重新登录会先校验密码，再发邮件验证码。忘记密码时在登录页使用已验证邮箱找回，重设后旧会话都会退出。

正式对外启用前，请用自己控制的邮箱确认注册、绑定、登录和找回的邮件都能收到。Resend 默认测试发信地址有收件人限制，不能代替自己的已验证发信域名。

## 排查

- 显示「邮箱服务正在准备中」：检查两个必需变量是否存在于 Production，并重新部署。
- 显示发送失败：在 Resend 控制台查看投递状态，确认密钥、发件域名、额度和收件邮箱。网站不会在发送失败时返回验证码发送成功。
- 没收到：查看垃圾邮件文件夹，60 秒后可重发；只输入最新邮件的验证码，10 分钟内有效。
- 旧账号忘记密码但从未绑定邮箱：无法用一个未经验证的邮箱证明账号归属；不能直接输入任意邮箱重置该账号。
- 不要在邮箱验证启用后随意删除发信配置，否则已验证用户无法完成登录的第二步。

官方文档：

- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/api-reference/emails/send-email
