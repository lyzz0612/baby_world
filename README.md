# Baby World

给我家宝宝定制的 Android 应用，把**学习**和**娱乐**放在一起，按 2 岁起的认知与操作习惯慢慢迭代。

当前首个模块是「认识动物」——点按认识动物、听叫声，适合低龄启蒙；后续会继续加更多适合 2 岁+ 的小游戏和认知内容。

## 关于这个 App

- **为谁做**：给我家宝宝（从 2 岁开始用）
- **做什么**：寓教于乐，既能玩也能学
- **怎么演进**：按年龄和兴趣逐步加模块，不追求大而全，优先做宝宝真正会用的

## 快速开始

```bash
cd mobile
npm install
npm start                  # Expo dev server
npm run android            # 真机/模拟器
npm run web                # 仅供 UI 调试，不能验证音频/OTA
```

## 仓库结构

```
├── mobile/                      # Expo / RN 客户端（唯一客户端）
│   ├── app/                     # expo-router 路由
│   ├── components/              # AnimalCard、ScreenBackground 等
│   ├── src/
│   │   ├── data/animals.ts      # 动物数据
│   │   ├── data/soundAssets.ts  # 由 generate:sounds 自动生成
│   │   ├── services/audioService.ts    # TTS → 220ms → 真实叫声
│   │   ├── services/clickStats.ts      # AsyncStorage 点击热度
│   │   └── services/updateChecker.ts   # OTA：fetch latest.json + 下载 + 安装
│   ├── assets/sounds/           # 真实叫声 + 预生成 TTS mp3
│   ├── scripts/
│   │   ├── generate-sound-assets.mjs   # 扫 assets/sounds → 生成 soundAssets.ts
│   │   └── patch-android-signing.mjs   # prebuild 后注入 release 签名
│   └── app.config.ts            # 读 env：APP_VERSION_NAME / EXPO_PUBLIC_UPDATE_CHECK_URL
├── .github/
│   ├── workflows/mobile-release.yml    # 唯一 CI：prebuild + gradle + R2
│   └── scripts/release-version.sh      # 从 R2 latest.json 计算下一版本号
├── docs/RELEASE.md              # 发布与 OTA 验证手册
└── openspec/                    # OpenSpec 工作流（提案 / 规格 / 归档）
```

## 应用内自动更新（OTA）

每次推 tag `v*`、或手动 `workflow_dispatch`，CI 会：

1. 从 R2 `latest.json` 算下一版本号（默认 `PATCH + 1`）
2. `npx expo prebuild --platform android` 生成 native 工程（不入仓）
3. 注入版本号 + `EXPO_PUBLIC_UPDATE_CHECK_URL` + 真实 keystore，`gradlew assembleRelease`
4. 把 APK 与新 `latest.json` 上传到 Cloudflare R2

应用启动时 `updateChecker.ts` 拉取 `latest.json`，远端 `versionCode` 更高就弹原生 Alert 让用户下载安装；远端 `minSupport > 本机 versionCode` 时强制更新。

详细流程、Secrets 配置、版本规则、验证清单见 [docs/RELEASE.md](docs/RELEASE.md)。

## 本地构建（不走 CI）

```bash
cd mobile
npm install

# 注入版本号 + 自定义 OTA 检查地址
$env:APP_VERSION_NAME="0.0.1"      # PowerShell；bash 用 export
$env:APP_VERSION_CODE="1"
$env:EXPO_PUBLIC_UPDATE_CHECK_URL="https://your-host/latest.json"

npx expo prebuild --platform android --clean
node scripts/patch-android-signing.mjs

cd android
./gradlew assembleDebug          # 或 assembleRelease + 注入 keystore env
```

不传 `EXPO_PUBLIC_UPDATE_CHECK_URL` 时回退到占位地址，客户端会跳过 OTA 检查（见 `updateChecker.ts`）。

## 技术栈

- **客户端**：React Native 0.81、Expo SDK 54、expo-router、expo-audio、expo-speech、AsyncStorage、expo-file-system、expo-intent-launcher、expo-application
- **CI**：GitHub Actions（Node 22 + JDK 21 + Gradle）
- **托管**：Cloudflare R2（S3 兼容 API）+ 自定义域名 CDN

## 相关文档

- [mobile/README.md](mobile/README.md) — 客户端开发与调试
- [docs/RELEASE.md](docs/RELEASE.md) — 发布与 OTA 完整说明
- [docs/app-release-config.example.json](docs/app-release-config.example.json) — `APP_RELEASE_CONFIG` Secret 模板
- `openspec/changes/migrate-to-react-native/` — RN 迁移设计与规格
