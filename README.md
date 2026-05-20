# 动物乐园

> **新主客户端：[`mobile/`（React Native + Expo）](mobile/README.md)。** 因荣耀等未成年人模式会拦截 WebView 类应用，已迁移到 RN 原生壳；日常开发请以 `mobile/` 为准。下文 Capacitor 工程文档保留作为已上线旧 APK 的运维参考，RN 真机验收通过后将清理（见 `openspec/changes/migrate-to-react-native/tasks.md` 第 9 节）。

## 快速开始（RN）

```bash
cd mobile
npm install
npm start
```

- **Android 真机/模拟器**：`npm run android`
- **Web 开发预览**（非生产验收）：`npm run web`

## 资源（RN）

- 动物数据：`mobile/src/data/animals.ts`（由旧 `src/data/animals.js` 同步而来）
- 音频：`mobile/assets/sounds/`（由 `public/sounds/` 复制；更新后运行 `npm run generate:sounds`）

---

## 遗留 Web / Capacitor

> 以下为旧 Capacitor 工程的功能/发布文档，仅供已上线旧 APK 的版本运维使用。新功能请走 `mobile/`。

# AnimalApp（动物乐园）

面向儿童的动物认知 Android 应用：React + Vite 构建 Web 界面，通过 Capacitor 打包为原生 APK。支持动物叫声播放、分类浏览，以及基于远程清单的 **应用内自动更新**。

## 功能介绍

### 应用内容

- **首页**：入口导航，进入「认识动物」等模块。
- **认识动物**：按分类浏览动物卡片（农场、动物园、海洋等），点击可播放对应叫声。
- **语音**：集成 Capacitor Text-to-Speech，用于朗读等场景（见 `audioService`）。
- **Android 壳**：`com.animal.app`，Capacitor WebView 承载前端资源。

### 自动更新（Release 客户端）

已安装用户无需重新 sideload 整包，只要 R2 上有新版本：

- 启动时通过 HTTPS 拉取 `latest.json`（[fccaikai/AppUpdate](https://github.com/fccaikai/AppUpdate)）。
- 远程 `versionCode` 更高时提示下载并安装 APK。
- 若本机版本低于 `minSupport`，则强制更新、不可跳过。

### CI / 发布

| Workflow | 触发 | 产物 |
|----------|------|------|
| `animal-app.yml` | `push` → `feature/animal-learning`、`workflow_dispatch` | Debug APK（GitHub Artifacts） |
| `app-release.yml` | 同上分支 `push`、tag `v*`、`workflow_dispatch` | Release APK + 覆盖 R2 上的 `latest.json` / `app-release.apk` |

版本规则：`versionCode = MAJOR×1_000_000 + MINOR×10_000 + PATCH`。

- **分支 push**：从 R2 读取当前 `versionName`，`PATCH + 1` 后构建发布。
- **tag `v1.2.0`**：使用 tag 去掉 `v` 后的完整版本号。
- **手动发布**：`workflow_dispatch` 填写 `version_name`（及可选 `release_notes`）。

更细的发布说明与验证清单见 [docs/RELEASE.md](docs/RELEASE.md)。

---

## 本地开发

### 环境要求

- Node.js 22+
- JDK 21（Android 构建）
- Android SDK（`ANDROID_HOME` 已配置）

### Web 开发

```bash
npm ci
npm run dev          # http://localhost:5173
npm run build        # 产出 dist/
```

### Android 调试包

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug    # Windows: gradlew.bat assembleDebug
```

APK 路径：`android/app/build/outputs/apk/debug/`。

指定更新检查地址（本地联调 AppUpdate）：

```bash
./gradlew assembleDebug -PUPDATE_CHECK_URL=https://你的域名/update/latest.json
```

注入版本号（与 CI 一致）：

```bash
./gradlew assembleRelease \
  -PVERSION_CODE=1000000 \
  -PVERSION_NAME=1.0.0 \
  -PUPDATE_CHECK_URL=https://你的域名/update/latest.json
```

---

## 发布配置（必读）

自动更新与 CI 发布依赖 **GitHub Secrets** 和 **Cloudflare R2**。未配置时 `app-release` workflow 会跳过。

### 1. Cloudflare R2

1. 创建 R2 桶，并绑定 **HTTPS 自定义域名**（公网可读）。
2. 创建 R2 API Token（对象读写），记下 `accessKeyId` / `secretAccessKey`。
3. 约定对象路径（默认）：
   - `update/latest.json` — 版本清单，App 启动时检查
   - `update/app-release.apk` — 最新安装包（每次发布覆盖同一 key）

确保浏览器可访问：`https://<你的域名>/update/latest.json` 与 APK URL。

### 2. GitHub Secret：`APP_RELEASE_CONFIG`

在仓库 **Settings → Secrets and variables → Actions** 新建 Secret，值为 JSON（勿提交到仓库）：

```json
{
  "r2": {
    "endpoint": "https://<account_id>.r2.cloudflarestorage.com",
    "bucket": "your-bucket",
    "accessKeyId": "YOUR_ACCESS_KEY",
    "secretAccessKey": "YOUR_SECRET_KEY"
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

完整字段说明见 [docs/app-release-config.example.json](docs/app-release-config.example.json)。

| 字段 | 含义 |
|------|------|
| `r2.*` | S3 兼容 API，供 Actions 上传 |
| `cdn.baseUrl` | 用户与 App 访问的 HTTPS 域名（无末尾 `/`） |
| `paths.*` | R2 对象 key，需与 CDN 路径一致 |
| `appUpdate.minSupport` | 低于此 `versionCode` 的客户端必须强制更新 |

### 3. Release 签名 Secrets（与 JSON 分开）

| Secret | 说明 |
|--------|------|
| `ANDROID_RELEASE_KEYSTORE` | Keystore 文件 **Base64** 整文件编码 |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore 密码 |
| `ANDROID_KEY_ALIAS` | 密钥别名 |
| `ANDROID_KEY_PASSWORD` | 密钥密码 |

生成 Base64（PowerShell）：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('release.keystore'))
```

Linux：

```bash
base64 -w0 release.keystore
```

CI 会解码为临时 keystore 并调用 `assembleRelease`；本地未设置 `ANDROID_KEYSTORE_PATH` 时 release 包可能为未签名/调试签名，仅适合调试。

### 4. 首次上线顺序

1. 按上文配置 R2 + 全部 Secrets。
2. 在 GitHub Actions 运行 **Release Animal App to R2** → `workflow_dispatch`，`version_name` 填 `1.0.0`（建立 R2 baseline）。
3. 将生成的 release APK **手动安装**到设备（首包 baseline）。
4. 之后向 `feature/animal-learning` push 会自动 patch+1 并更新 R2；升 MINOR/MAJOR 用 tag `v1.1.0` 或再次手动 workflow。

### 5. `latest.json` 格式

CI 自动生成，AppUpdate 依赖该结构：

```json
{
  "versionCode": 1000000,
  "versionName": "1.0.0",
  "content": "更新说明#第二行用井号分隔",
  "minSupport": 1,
  "url": "https://download.example.com/update/app-release.apk"
}
```

---

## 项目结构

```
├── mobile/                 # React Native (Expo) 主客户端 ← 新增
├── src/                    # React 前端（旧 Capacitor）
├── android/                # Capacitor Android 工程（旧）
├── .github/workflows/      # CI：debug 构建 + R2 release
├── .github/scripts/        # 版本计算脚本 release-version.sh
└── docs/RELEASE.md         # 发布与验证详细文档
```

## 技术栈

- **新客户端**：React Native、Expo SDK 54、expo-router、expo-audio、expo-speech
- **旧前端**：React 19、Vite 8、React Router、Tailwind CSS 4
- **旧原生**：Capacitor 8、Android SDK 35
- **更新**：JitPack `com.github.fccaikai:AppUpdate`
- **托管**：Cloudflare R2（S3 API）+ 自定义域名 CDN

## 相关文档

- [docs/RELEASE.md](docs/RELEASE.md) — 验证清单、本地模拟更新、故障排查
- [docs/app-release-config.example.json](docs/app-release-config.example.json) — `APP_RELEASE_CONFIG` 模板
- [mobile/README.md](mobile/README.md) — RN 主客户端开发与构建指南
