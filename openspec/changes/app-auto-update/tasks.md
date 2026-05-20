## 1. Android 构建与依赖

- [x] 1.1 在 `android` 工程添加 JitPack 与 `com.github.fccaikai:AppUpdate` 依赖
- [x] 1.2 修改 `build.gradle` 支持 `-PVERSION_CODE` / `-PVERSION_NAME` 注入
- [x] 1.3 配置 release 签名：独立 Secret `ANDROID_RELEASE_KEYSTORE`（base64）及密码/alias Secrets；Gradle `signingConfigs.release`

## 2. 客户端自动更新

- [x] 2.1 在 `MainActivity`（或 Application）集成 `UpdateWrapper`，配置 HTTPS 检查 URL
- [x] 2.2 补充安装未知应用等 Manifest 权限与 FileProvider 路径（若缺）
- [x] 2.3 验证：模拟 `latest.json` 中更高 `versionCode` 时出现更新流程

## 3. 发布流水线

- [x] 3.1 新增/扩展 workflow：`push` 发布分支、`push` tags `v*`、`workflow_dispatch`
- [x] 3.2 实现 `APP_RELEASE_CONFIG` 解析（`jq`）与 R2 下载/上传（`aws s3` + endpoint）
- [x] 3.3 实现版本脚本：分支 patch+1、tag/手动取 name、公式算 code、上限与单调校验
- [x] 3.4 构建 `assembleRelease` 并生成 `latest.json`（含 `url`、`minSupport`、`content`）
- [x] 3.5 配置 `concurrency` 与日志脱敏（不打印 secret）

## 4. 基础设施与文档

- [x] 4.1 在 GitHub 创建 Secret `APP_RELEASE_CONFIG`（JSON）与 `ANDROID_RELEASE_KEYSTORE` 等签名 Secrets（示例写入 README 或内部文档）
- [ ] 4.2 配置 Cloudflare R2 桶、API Token、自定义域名 HTTPS
- [ ] 4.3 首次 `workflow_dispatch` 发布 `1.0.0` baseline，再发布含 AppUpdate 的客户端

## 5. 验证

- [ ] 5.1 分支 push 后 R2 上 `latest.json` patch 递增且 APK 可下载
- [ ] 5.2 tag `v1.1.0` 发布后 `versionName` 与 code 符合公式
- [ ] 5.3 已安装旧版 App 能检测并安装 R2 最新 APK
