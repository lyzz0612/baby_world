## 新增需求

### 需求:应用必须检查远程版本清单

打包后的 release 应用必须在启动时（或设计约定的入口）通过 HTTPS 请求远程 `latest.json`，并使用 fccaikai/AppUpdate 解析结果。

#### 场景:存在新版本

- **当** 远程 `versionCode` 大于本机已安装 APK 的 `versionCode`
- **那么** 应用必须展示更新提示，并允许用户下载 `url` 字段指向的 APK 并触发安装流程

#### 场景:已是最新版本

- **当** 远程 `versionCode` 小于或等于本机 `versionCode`
- **那么** 应用不得弹出强制更新对话框（静默或可选提示“已是最新”由产品决定，但不得阻断使用）

### 需求:低于最低支持版本时必须强制更新

当远程清单中 `minSupport` 大于本机 `versionCode` 时，应用必须禁止跳过更新（按 AppUpdate 强制更新行为）。

#### 场景:强制更新

- **当** 本机 `versionCode` 小于 `latest.json` 中的 `minSupport`
- **那么** 更新对话框不得提供取消或跳过路径（与库能力一致）

### 需求:更新检查地址必须固定且使用 HTTPS

应用内配置的 JSON 检查地址必须为 HTTPS，且与 CI 发布的 `cdn.baseUrl` + `paths.latestJson` 一致。

#### 场景:非法或不可达地址

- **当** 检查 URL 不可达或返回非 JSON
- **那么** 应用不得崩溃；可记录错误并继续进入主界面（不阻断首次使用）
