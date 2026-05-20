## 新增需求

### 需求:版本号必须由 versionName 按公式计算

发布流水线必须从 `versionName`（`MAJOR.MINOR.PATCH`）计算 `versionCode`，公式为 `MAJOR × 1_000_000 + MINOR × 10_000 + PATCH`，并写入 APK 与 `latest.json`。

#### 场景:分支 push 自动递增 patch

- **当** 触发事件为发布分支的 push（非 tag）
- **那么** 流水线必须从 R2 读取当前 `latest.json` 的 `versionName`，将 PATCH 加 1（且 PATCH 不得超过 9999），重算 `versionCode` 后构建 release APK

#### 场景:patch 已达上限

- **当** 当前 `versionName` 的 PATCH 为 9999 且再次发生分支 push 发布
- **那么** 流水线必须失败并提示通过 tag 或手动 workflow 提升 MINOR 或 MAJOR

#### 场景:tag 指定完整版本

- **当** 触发事件为匹配 `v*` 的 tag push
- **那么** `versionName` 必须取自 tag（去掉 `v` 前缀），并按公式计算 `versionCode`，不得仅递增 patch

#### 场景:手动指定版本

- **当** 触发事件为 `workflow_dispatch` 且提供 `version_name` 输入
- **那么** 必须使用输入值作为 `versionName` 并按公式计算 `versionCode`

### 需求:发布产物必须覆盖 R2 最新对象

每次成功发布必须将 release APK 与 `latest.json` 上传至配置的路径，且使用相同 object key 覆盖，不得保留多版本 APK 对象。

#### 场景:成功发布

- **当** Gradle `assembleRelease` 成功
- **那么** 必须上传 APK 至 `paths.apk`，并上传包含正确 `versionCode`、`versionName`、`url`、`minSupport`、`content` 的 `latest.json` 至 `paths.latestJson`

### 需求:托管与 R2 配置必须来自单一 JSON Secret

流水线必须从 GitHub Secret `APP_RELEASE_CONFIG` 读取 JSON，并用 `jq` 解析 `r2`、`cdn`、`paths`、`appUpdate` 字段；除 workflow_dispatch 的运行时输入与 **release 签名专用 Secret** 外，不得要求新增多个独立 Secret 存放 R2 端点或桶名。

#### 场景:解析配置

- **当** workflow 开始执行发布任务
- **那么** 必须从 `APP_RELEASE_CONFIG` 获取 R2 凭证与对象路径，且不得在日志中输出 `secretAccessKey`

### 需求:新发布版本的 versionCode 必须单调递增

相对 R2 上既有 `latest.json`，新发布的 `versionCode` 必须严格大于由旧 `versionName` 计算得到的 `versionCode`。

#### 场景:版本倒退

- **当** 计算得到的新 `versionCode` 小于或等于旧版
- **那么** 流水线必须失败，且不得上传 APK 或覆盖 `latest.json`
