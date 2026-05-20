## 上下文

- 项目为 Capacitor + React 的 Android 应用（`com.animal.app`），当前 `versionCode`/`versionName` 写死在 `android/app/build.gradle`，`MainActivity` 为裸 `BridgeActivity`。
- 现有 workflow（`.github/workflows/animal-app.yml`）在 `feature/animal-learning` 分支上构建 **debug APK** 并上传 GitHub Artifacts，无 R2、无 release、无更新检查。
- 目标用户通过 sideload 安装，需自建更新源（Cloudflare R2 + 自定义域名 HTTPS）。

## 目标 / 非目标

**目标：**

- 使用 **fccaikai/AppUpdate** 检查远程 `latest.json` 并引导安装最新 release APK。
- R2 仅保留 **一份** `update/latest.json` 与 `update/app-release.apk`（同 key 覆盖上传）。
- GitHub Actions 支持 **push 分支 / push tag `v*` / workflow_dispatch** 三种发布触发，版本规则见下。
- CI 配置合并为单个 Secret **`APP_RELEASE_CONFIG`**（JSON），用 `jq` 解析。

**非目标：**

- iOS 更新、应用内 Web 热更新（仅换 web 资源不重打 APK）。
- R2 历史版本保留、灰度多渠道、JSON/APK 签名防篡改（可后续增强）。
- 修改默认开发分支策略或引入 main 分支发布。

## 决策

### 1. 更新库：fccaikai/AppUpdate

- **选择**：JitPack `com.github.fccaikai:AppUpdate`，`UpdateWrapper` + 固定 JSON URL。
- **理由**：需求明确、JSON 契约简单（`versionCode`、`versionName`、`content`、`minSupport`、`url`）。
- **替代**：CheckVersionLib（更灵活但集成更重）— 未选。

### 2. 存储：Cloudflare R2（S3 API），覆盖写入

- **对象布局**：
  - `update/latest.json` — AppUpdate `setUrl` 指向的清单（每次发布覆盖）。
  - `update/app-release.apk` — 固定 APK 路径（每次发布覆盖）；`latest.json.url` 指向 `cdn.baseUrl + paths.apk`。
- **理由**：只保留最新，存储恒定；PUT 同 key 即覆盖，无需先删。
- **访问**：公网 HTTPS 自定义域名（非 presigned），URL 长期有效。

### 3. 版本编码

```
versionName = MAJOR.MINOR.PATCH（非负整数）
versionCode = MAJOR × 1_000_000 + MINOR × 10_000 + PATCH
```

| 段 | 范围 | 变更方式 |
|----|------|----------|
| PATCH | 0–9999 | 仅 **push 发布分支** 时从 R2 `latest.json` 读取 `versionName` 后 patch+1 |
| MINOR / MAJOR | 人工（建议 MINOR ≤ 99） | **push tag `vM.m.p`** 或 **workflow_dispatch** 输入完整 `versionName` |

- **校验**：新 `versionCode` 必须大于由旧 `versionName` 算出的 code；`patch == 9999` 时分支 push 必须失败并提示升 MINOR。
- **Gradle**：CI 通过 `-PVERSION_CODE` / `-PVERSION_NAME` 注入，`build.gradle` 读取属性。

### 4. CI 触发（绑定发布分支，与 main 无关）

| 事件 | versionName | 说明 |
|------|-------------|------|
| `push` → `feature/animal-learning`（可配置） | patch+1 | 从 R2 拉取 `latest.json` 作基准 |
| `push` → tags `v*` | tag 去 `v` 前缀 | 如 `v1.2.0` → `1.2.0` |
| `workflow_dispatch` | `inputs.version_name` | 可选 `release_notes` 写入 `content` |

- 使用 `concurrency: group: app-release` 避免并发发布互相覆盖。
- 构建 **`assembleRelease`**（非 debug），release 签名使用 **独立 Secret**（见决策 6）。

### 5. 单一配置 Secret：`APP_RELEASE_CONFIG`

```json
{
  "r2": {
    "endpoint": "https://<account_id>.r2.cloudflarestorage.com",
    "bucket": "your-bucket",
    "accessKeyId": "...",
    "secretAccessKey": "..."
  },
  "cdn": {
    "baseUrl": "https://download.example.com"
  },
  "paths": {
    "latestJson": "update/latest.json",
    "apk": "update/app-release.apk"
  },
  "appUpdate": {
    "minSupport": 1
  }
}
```

- workflow `env.APP_RELEASE_CONFIG: ${{ secrets.APP_RELEASE_CONFIG }}`。
- 步骤内 `jq` 提取字段；**禁止**将含 `secretAccessKey` 的整段打印到日志。
- 手动发布的 `version_name` / `release_notes` 保留为 **workflow inputs**，不写入固定 JSON。

### 6. Release 签名：独立 Secret

- **选择**：keystore **不**放入 `APP_RELEASE_CONFIG`，使用单独 Secret（建议名 **`ANDROID_RELEASE_KEYSTORE`**）。
- **内容建议**（实现时二选一或组合）：
  - 方式 A：Secret 值为 **base64 编码的 `.jks` 文件**，workflow 解码为临时文件；另用 Secret 存 `KEYSTORE_PASSWORD`、`KEY_ALIAS`、`KEY_PASSWORD`。
  - 方式 B：多个 Secret（`KEYSTORE_BASE64` + 上述密码/别名），仍与 `APP_RELEASE_CONFIG` 分离。
- **理由**：二进制 keystore 不宜塞进 JSON；轮换签名与轮换 R2 凭证互不影响；避免单 Secret 体积与泄露面过大。
- **`APP_RELEASE_CONFIG` 仍只负责**：R2、CDN 路径、`minSupport` 等发布托管配置。

### 7. `latest.json` 生成

发布结束时写入（覆盖 R2）：

```json
{
  "versionCode": <由 versionName 计算>,
  "versionName": "<M.m.p>",
  "content": "<notes，# 分隔行>",
  "minSupport": <appUpdate.minSupport>,
  "url": "<cdn.baseUrl>/<paths.apk>"
}
```

### 8. 客户端集成点

- 在 `MainActivity.onCreate`（或 Application）启动 `UpdateWrapper`；检查 URL 为 `cdn.baseUrl + paths.latestJson`（可构建时写入 `strings.xml` 或 BuildConfig）。
- 已有 `FileProvider` — 满足安装路径；补充 `REQUEST_INSTALL_PACKAGES` 等（按 targetSdk）。

## 风险 / 权衡

| 风险 | 缓解 |
|------|------|
| 分支 push 并发导致重复 patch | `concurrency`；仅允许发布分支触发 |
| `versionName` 与 APK `versionCode` 不一致 | CI 只从 name 算 code，禁止手写 code |
| R2/APK 被篡改 | HTTPS + 固定域名；后续可加 APK 哈希校验 |
| Release 签名未配置导致无法安装更新 | 实现前配置 keystore；首包需用户手动装 baseline |
| patch 顶格后仍 push 分支 | CI 显式失败并文档说明升 MINOR |

## 迁移计划

1. 配置 R2 桶、自定义域名、R2 API Token，写入 `APP_RELEASE_CONFIG`。
2. 配置独立 Secret：`ANDROID_RELEASE_KEYSTORE`（base64）及 keystore/ key 密码、alias（若尚无）。
3. 合并/新增 workflow，先 **workflow_dispatch** 发首版 `1.0.0` 到 R2。
4. 发一版集成 AppUpdate 的 release APK（用户安装 baseline）。
5. 之后 routine：分支 push 自动 patch 发布，或 tag/手动升 MINOR/MAJOR。

回滚：将 R2 `latest.json` 的 `versionName`/`versionCode`/`url` 指回上一版仅当仍保留旧 APK 时可行；本设计 **不保留** 旧 APK，回滚需重新上传旧 APK 并改 manifest。

## 待定问题

- `feature/animal-learning` 是否重命名为专用 `release/*` 分支。
- AppUpdate 检查时机：冷启动一次 vs 设置页手动（可在实现时默认启动检查 + 可选间隔）。
