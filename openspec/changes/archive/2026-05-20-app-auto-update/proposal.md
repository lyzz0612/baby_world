## 为什么

打包后的 Android 应用目前无法自动检测并安装新版本，版本号也固定在 `build.gradle` 中，CI 仅产出 debug APK 到 GitHub Artifacts。需要为已安装用户提供基于 AppUpdate 的更新能力，并通过 Cloudflare R2 托管最新安装包与版本清单，由 GitHub Actions 在发布分支上自动发布。

## 变更内容

- 集成 **fccaikai/AppUpdate**：应用启动或合适时机检查固定 HTTPS 上的 `latest.json`，提示下载并安装 release APK。
- **版本规则**：`versionCode = MAJOR×1_000_000 + MINOR×10_000 + PATCH`；`PATCH`（0–9999）仅分支 push 自动 +1；`MINOR`/`MAJOR` 由 tag 或手动 workflow 指定。
- **CI 发布**：扩展/新增 workflow，支持三种触发（push 分支、push `v*` tag、`workflow_dispatch`）；构建 release APK；上传并**覆盖** R2 上的 `update/latest.json` 与 `update/app-release.apk`。
- **配置收敛**：托管配置仅一个 GitHub Secret `APP_RELEASE_CONFIG`（JSON，R2/CDN/路径等）；**release keystore 使用独立 Secret**（如 `ANDROID_RELEASE_KEYSTORE`），不并入 JSON。
- 从 `latest.json` 读取上一版 `versionName` 作为分支 push 的递增基准。

## 功能 (Capabilities)

### 新增功能

- `android-auto-update`: 客户端检查更新、下载安装、版本比较与强制更新（`minSupport`）行为。
- `release-publish`: GitHub Actions 版本计算、release 构建、R2 上传与 manifest 生成。

### 修改功能

<!-- 无现有 openspec 规范 -->

## 影响

- `android/app/build.gradle`：可注入 `versionCode` / `versionName`。
- `android/app/src/main/java/.../MainActivity`（或 Application）：集成 AppUpdate。
- `android/app/src/main/AndroidManifest.xml`：安装未知应用等权限（若尚未具备）。
- `.github/workflows/`：发布流水线（可与现有 `animal-app.yml` 合并或拆分）。
- GitHub Secrets：`APP_RELEASE_CONFIG`（JSON）。
- 外部：Cloudflare R2 桶、自定义域名 HTTPS、JitPack 依赖。
