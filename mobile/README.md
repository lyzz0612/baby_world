# 动物乐园（React Native / Expo）

唯一客户端。面向 Android 平板（含荣耀未成年人模式场景）。SDK 54、expo-router、原生 UI 渲染。

## 开发

```bash
cd mobile
npm install
npm start          # Metro，按 a 打开 Android
npm run android    # 编译并安装到已连接设备/模拟器
npm run web        # 仅 UI 调试，不能验证音频/OTA
```

新增或更新 `assets/sounds/` 后执行：

```bash
npm run generate:sounds
```

会扫描 `assets/sounds/` 写出 `src/data/soundAssets.ts`。

## 构建 release APK（本地）

```bash
$env:APP_VERSION_NAME="1.0.0"
$env:APP_VERSION_CODE="1000000"
$env:EXPO_PUBLIC_UPDATE_CHECK_URL="https://your-host/update/latest.json"

npx expo prebuild --platform android --clean
node scripts/patch-android-signing.mjs

cd android
./gradlew assembleRelease    # 真签名需要再 export ANDROID_KEYSTORE_PATH/KEYSTORE_PASSWORD/KEY_ALIAS/KEY_PASSWORD
```

CI 走的就是同一套（见 `.github/workflows/mobile-release.yml` 与 `docs/RELEASE.md`）。

## 真机音频测试

1. USB 连接平板并开启开发者调试，或启动模拟器
2. `npm run android`
3. 「认识动物」→ 点击任意卡片 → 卡片高亮 + emoji 抖动 + 自动播 "xxx 怎么叫" + 真实叫声
4. 播放过程中点别的动物：旧序列立即停，新序列马上开
5. 飞行模式下应仍能完整播放（所有 mp3 已打包进 APK）

## OTA 自动更新

启动时 `src/services/updateChecker.ts` 拉取 `EXPO_PUBLIC_UPDATE_CHECK_URL` 指向的 `latest.json`：

- 本地 `versionCode < 远端 versionCode`：弹原生 Alert，用户点 "立即更新" 后用 `expo-file-system` 下载 APK 到 cache，`expo-intent-launcher` 触发系统安装器
- 远端 `minSupport > 本地 versionCode`：只给 "立即更新"，弹窗 `cancelable: false`
- `EXPO_PUBLIC_UPDATE_CHECK_URL` 未设置或仍是占位 `download.example.com` 时，跳过检查

`latest.json` 结构与 `app-release-config.example.json` / `release-version.sh` 沿用，详见 [`../docs/RELEASE.md`](../docs/RELEASE.md)。

## 包名 / 权限

| 项 | 值 |
|---|---|
| Android package | `com.animal.app` |
| 显示名 | 动物乐园 |
| 权限 | `INTERNET`（OTA 检查 + 下载）、`REQUEST_INSTALL_PACKAGES`（触发安装器） |

> 之前迁移过程中曾用 `blockedPermissions` 屏蔽 INTERNET 试图规避荣耀未成年人模式。OTA 方案确定后必须恢复 INTERNET，否则更新链路完全断。是否仍被荣耀拦截以真机验证为准。

## 音量

`expo-audio` 的 `player.volume` 上限为 1.0，没有软件增益。如果觉得叫声偏小，**请直接处理音频源文件**（用 ffmpeg 之类工具提高响度）后再 `npm run generate:sounds`。

## 音频实现

`src/services/audioService.ts`：

- `createAudioPlayer(source)` + `addListener('playbackStatusUpdate', s => s.didJustFinish && finish(true))`
- 全局 `currentToken` 标识最新一次播放；`stop()` 让旧序列立即退出
- 每段 `playSource` 自管本地 `AudioPlayer`，结束/取消时 `remove()`
- 顺序：预生成 TTS mp3 → 220ms 间隔 → 真实叫声
- TTS mp3 缺失时退回 `expo-speech` 系统 TTS

## 路由

`expo-router`，文件即路由：

- `app/_layout.tsx` — Stack，启动时调一次 `checkForUpdate()`
- `app/index.tsx` — 首页
- `app/animals/index.tsx` — 动物列表（按钮翻页 + 点击直接播 + 热度排序）

## Web 预览限制

`npm run web` 启动后能调 UI 布局，但：

- expo-audio 在 web 走 HTMLAudioElement，行为不等同于原生
- expo-intent-launcher 没有 web 实现，OTA 安装链路无法预览
- INTERNET / REQUEST_INSTALL_PACKAGES 在 web 不存在
- 荣耀未成年人模式场景必须在 Android 真机验证

把 web 当 UI 草稿用即可，不要拿来代替真机回归。
