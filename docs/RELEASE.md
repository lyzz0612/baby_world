# Baby World — Release & Auto-Update（RN）

## 总体流程

每次推 tag `v*`、或手动 `workflow_dispatch` 会触发 `.github/workflows/mobile-release.yml`：

```
checkout
  ↓
release-version.sh         # 从 R2 latest.json 读取上一版，PATCH+1（或用 tag / 手动 input）
  ↓
mobile/ npm ci
  ↓
expo prebuild --platform android --clean   # 生成 mobile/android/
  ↓ (注入 APP_VERSION_NAME / APP_VERSION_CODE / EXPO_PUBLIC_UPDATE_CHECK_URL)
patch-android-signing.mjs  # 把 release buildType 接到真实 keystore
  ↓
gradlew assembleRelease    # 出 APK
  ↓
生成 latest.json + aws s3 cp 到 Cloudflare R2
```

应用启动时 `mobile/src/services/updateChecker.ts` 拉取 `latest.json`，比对 `versionCode`：远端更高时弹原生 Alert 让用户确认下载安装；远端 `minSupport > 本地 versionCode` 时只给"立即更新"按钮（best-effort 强制更新）。

## GitHub Secrets

### `APP_RELEASE_CONFIG` (JSON, 单 secret)

R2 / CDN 路径与 `minSupport`。示例：

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

完整字段说明见 [docs/app-release-config.example.json](app-release-config.example.json)。

### Release 签名（独立 secrets）

| Secret | 说明 |
|--------|------|
| `ANDROID_RELEASE_KEYSTORE` | Keystore 文件 Base64 整文件编码 |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore 密码 |
| `ANDROID_KEY_ALIAS` | 密钥别名 |
| `ANDROID_KEY_PASSWORD` | 密钥密码 |

生成 Base64：

```powershell
# PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('release.keystore'))
```

```bash
# Linux
base64 -w0 release.keystore
```

CI 解码后写入 `RUNNER_TEMP/release.keystore`，并通过 `ANDROID_KEYSTORE_PATH/KEYSTORE_PASSWORD/KEY_ALIAS/KEY_PASSWORD` 这四个环境变量传给 gradle；`mobile/scripts/patch-android-signing.mjs` 在 prebuild 之后向 `mobile/android/app/build.gradle` 注入读取这些环境变量的 `signingConfigs.release`。

## Cloudflare R2

1. 创建 R2 桶并绑定 **HTTPS 自定义域名**（公网可读）。
2. 创建 R2 API Token（对象读写），把 `accessKeyId / secretAccessKey` 写入 `APP_RELEASE_CONFIG`。
3. `cdn.baseUrl` 设为绑定的自定义域名（无末尾 `/`）。
4. 浏览器可访问 `{baseUrl}/update/latest.json` 与 `{baseUrl}/update/app-release.apk`。

## 版本号规则

`versionCode = MAJOR×1_000_000 + MINOR×10_000 + PATCH`

| 触发 | versionName 来源 |
|------|------------------|
| 推 tag `v1.2.0` | 去掉 `v` 前缀 → `1.2.0` |
| `workflow_dispatch` | 必填的 `version_name` 输入 |

> 日常 push 到 `master` **不会**触发 release（见 `docs/CI-SPEEDUP.md`）。首包 baseline 后，小版本可用 dispatch（脚本会读 R2 上版本并 PATCH+1），或 push tag 升 MINOR/MAJOR。

`PATCH` 必须 `< 9999`，`MINOR` 必须 `< 99`；超过需要换成 tag 或手动 dispatch 升 MINOR/MAJOR。

## 首次上线（baseline）

1. 配置好 R2 + 全部 Secrets。
2. Actions 跑 **Release Baby World App to R2** → `workflow_dispatch`，`version_name` 填 `1.0.0`。
3. 把 Workflow 产物里的 release APK 手动安装到设备（首包 baseline）。
4. 之后用 `workflow_dispatch`（填下一版 versionName）或 push tag 发版。

## 验证清单

### 5.1 分支 push → R2

- [ ] 手动 dispatch 或 push tag，确认 `update/latest.json` 更新且 `update/app-release.apk` 可经 HTTPS 下载
- [ ] 安装新 APK，启动后无 OTA 弹窗（远端版本与本地相同）

### 5.2 Tag 发布

- [ ] push `v1.1.0`；`latest.json.versionName` = `1.1.0`，`versionCode` = `1×1_000_000 + 1×10_000 + 0`

### 5.3 客户端 OTA 升级

- [ ] 安装一个低版本 APK（`versionCode` 较低）
- [ ] 让 R2 上 `latest.json` 的 `versionCode` 高于本地，`url` 指向有效 APK
- [ ] 冷启动 App：弹出 "发现新版本"；选 "立即更新" 进入系统安装器并完成升级
- [ ] 若 `latest.json.minSupport` 高于本地，弹窗只剩 "立即更新"（无法 "稍后"）

### 5.4 本地联调（无 R2）

把 `latest.json` 放到任意 HTTPS 主机：

```json
{
  "versionCode": 999,
  "versionName": "9.9.9",
  "content": "Test#Line2",
  "minSupport": 1,
  "url": "https://your-cdn/update/app-release.apk"
}
```

打 release APK 时通过环境变量临时覆盖 OTA 检查地址：

```bash
cd mobile
EXPO_PUBLIC_UPDATE_CHECK_URL=https://your-host/latest.json \
APP_VERSION_NAME=0.0.1 APP_VERSION_CODE=1 \
  npx expo prebuild --platform android --clean
node scripts/patch-android-signing.mjs
cd android && ./gradlew assembleDebug    # 或 assembleRelease + 注入 keystore env
```

安装得到的 APK；冷启动后若远端 `versionCode` 大于本机就会出现升级弹窗。

## 与旧 Capacitor 流程的差异

| 项 | 旧（Capacitor） | 新（RN） |
|---|---|---|
| 客户端检查更新 | `com.github.fccaikai:AppUpdate` Java SDK，`UPDATE_CHECK_URL` 通过 gradle `-PUPDATE_CHECK_URL` 注入到 `strings.xml` | `mobile/src/services/updateChecker.ts`，`updateCheckUrl` 通过 `app.config.ts → expo.extra` 注入；下载用 `expo-file-system` 的 `File.downloadFileAsync`，安装用 `expo-intent-launcher` + content URI |
| Workflow | `animal-app.yml`（debug）+ `app-release.yml`（release） | 单一 `mobile-release.yml`（包含 release artifact 上传，debug 包按需手动 dispatch 替换 versionName 即可） |
| Android 工程 | 仓库内 `android/`，长期维护 | 由 `expo prebuild` 在 CI 内生成，**不入仓**；自定义 native 改动需走 expo plugin |
| 网络权限 | 必有 `INTERNET` | 必有 `INTERNET` + `REQUEST_INSTALL_PACKAGES`（OTA 安装 APK 需要） |

`APP_RELEASE_CONFIG` / 签名 secrets / R2 路径 / `latest.json` 字段结构沿用旧版，不需要重新配置。
