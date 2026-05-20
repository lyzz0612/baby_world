# 动物乐园（React Native / Expo）

原生 UI 客户端，替代 Capacitor WebView 壳。面向 Android 平板（含荣耀未成年人模式场景）。

## 开发

```bash
cd mobile
npm install
npm start          # Metro，按 a 打开 Android 模拟器
npm run web        # 浏览器预览 UI（见下方限制）
npm run android    # 编译并安装到已连接设备/模拟器
```

新增或更新 `assets/sounds/` 后执行：

```bash
npm run generate:sounds
```

## Web 预览范围（dev-web-preview）

| 可预览 | 必须在 Android 真机/APK 验收 |
|--------|------------------------------|
| 首页、动物列表布局 | 本地 mp3 + TTS 播放链路 |
| 翻页、点击、排序逻辑 | 荣耀未成年人模式是否拦截 |
| | 飞行模式离线 |

Web 下音频失败时详情页仍可关闭返回，不应白屏。

## Android 真机音频测试

1. USB 连接平板并开启开发者调试，或启动模拟器  
2. `npm run android`  
3. 进入「认识动物」→ 点击任意卡片 → 应自动播放「怎么叫」+ 叫声  
4. 点「再听一次」应重播；点 ✕ 应立即静音  

## 打 APK（EAS）

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

本地 Gradle（需 Android Studio）：

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

## 包名

- Android：`com.animal.app`
- 显示名：动物乐园

## 关于网络权限（家长模式相关）

`app.json` 中已用 `blockedPermissions: ["android.permission.INTERNET"]` 屏蔽 INTERNET 权限，
让生产 APK 在系统层面被识别为离线应用，降低被荣耀未成年人模式归类为「打开网页」的概率。

注意：

- **Expo Go / dev-client 调试** 依赖 INTERNET 与 Metro 通信，开发期权限仍然存在
- 上述屏蔽 **仅在 `expo prebuild` + Gradle 或 EAS 生产构建后** 真正生效
- 拿到 release APK 后建议解包 `AndroidManifest.xml` 确认无 `<uses-permission android:name="android.permission.INTERNET" />`

## 音量

`expo-av` 的 `volume` 上限为 1.0，无软件增益。如觉得叫声偏小，请直接
处理音频源文件（提高响度）后重新生成 `src/data/soundAssets.ts`：

```bash
npm run generate:sounds
```

## 音频实现

使用 `expo-audio`（SDK 54 推荐），通过 `createAudioPlayer` 控制播放，
`addListener('playbackStatusUpdate', ...)` 接收 `didJustFinish`。

设计上：

- 全局 `currentToken` 标识最新一次播放；`stop()` 会让旧序列立即退出
- 每段 `playSource` 自管本地 `AudioPlayer`，结束/取消时 `remove()`
- 系统 TTS（`expo-speech`）仅当预生成 mp3 缺失时兜底

