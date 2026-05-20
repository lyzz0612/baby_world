## 为什么

当前「动物乐园」基于 Capacitor + WebView，在荣耀平板未成年人模式下易被系统识别为「打开网页」并拦截；同时 Web 滑动与点击在儿童使用场景下易冲突。React Native 使用原生控件渲染，可规避 WebView 壳限制，并保留团队 React 经验；Expo 支持 Web 预览以加速日常开发，关键能力仍在 Android 真机验收。

## 变更内容

- **BREAKING**：移除 Capacitor Android 壳与 Vite 作为主客户端的运行方式；以 Expo / React Native 工程为唯一面向用户的移动应用交付形态。
- 新建 RN 应用工程（推荐 Expo），迁移首页、动物列表（按钮翻页、无分类 Tab）、动物详情与发声流程。
- 迁移点击频率统计与按热度排序（持久化存储替代 `localStorage`）。
- 迁移本地动物数据与 `public/sounds` 音频资源打包方案。
- 保留 TTS 兜底与真实叫声播放，使用 RN 原生音频 / TTS 能力。
- 可选保留 `npm run web`（Expo Web）用于 UI 与逻辑的快速预览，不作为生产与家长模式验收环境。
- 原 `android/` Capacitor 工程在迁移完成并验证后归档或删除（实现阶段决定）。

## 功能 (Capabilities)

### 新增功能

- `rn-app-shell`: Expo/RN 应用壳、路由、主题、安全区与 Android 构建配置（无 WebView 主 UI）。
- `animal-catalog`: 动物数据加载、按钮横向翻页列表、移除分类 Tab、网格展示。
- `animal-playback`: 点击动物后的详情/播放流程（预生成 TTS mp3 → 真实叫声）、停止与重播。
- `animal-click-ranking`: 点击次数记录、按热度排序、关闭详情后刷新顺序。
- `dev-web-preview`: Expo Web 开发预览约定（能力范围与非目标平台行为）。

### 修改功能

<!-- 项目尚无 openspec/specs 基线，无增量修改项 -->

## 影响

- **代码**：`src/`（React Web）、`capacitor.config.json`、`android/` Capacitor 工程将逐步被 `mobile/`（或根目录 RN 工程）替代。
- **依赖**：移除 `@capacitor/*` 主路径依赖；新增 `expo`、`react-native` 及音频/存储相关库。
- **资源**：`src/data/animals.js`、`public/sounds/` 需迁入 RN 资源体系（asset / bundle）。
- **CI/CD**：现有 Android APK 构建流程需改为 EAS Build 或 Gradle（Expo prebuild）流程。
- **用户设备**：荣耀等 Android 平板以原生 APK 安装；未成年人模式行为需在真机回归验证。
