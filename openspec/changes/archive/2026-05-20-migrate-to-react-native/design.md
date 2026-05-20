## 上下文

- **现状**：`animal-app` 为 Vite + React 19 Web 应用，通过 Capacitor 8 打包 Android；动物数据在 `src/data/animals.js`，音频在 `public/sounds/`；已实现无分类 Tab、按钮翻页、点击排序（`localStorage`）、`AnimalModal` 播放链（TTS mp3 → 真实叫声）。
- **约束**：目标设备为 Android 平板（含荣耀未成年人模式）；应用须离线可用；儿童交互要求大点击区、避免滑动手势误触；团队熟悉 React。
- **利益相关者**：儿童用户、家长（设备策略）、维护者（单代码库优先）。

## 目标 / 非目标

**目标：**

- 以 **Expo (SDK 52+)** 初始化 RN 工程，主 UI 为原生渲染，Android 发布 APK。
- 功能 parity：首页入口、动物翻页列表、详情发声、点击排序持久化。
- 支持 **Expo Web** 用于开发期 UI/逻辑预览；文档明确 Web 与 Android 能力差异。
- 动物数据与音频资源可维护（尽量复用现有 JSON/文件结构）。
- 构建出可在荣耀平板安装的 release APK，并在未成年人模式下验证不被当作「浏览器打开网页」。

**非目标：**

- iOS / 鸿蒙 NEXT 正式上架（可预留目录结构，本变更不实现）。
- 重写或扩展动物内容 CMS、账号、家长控制后台。
- 在 Web 预览中保证与 Android 100% 一致的 TTS/音频与家长模式行为。
- 保留 Capacitor 双轨长期并行维护。

## 决策

### 1. 使用 Expo 托管工作流（非 bare RN 从零）

- **选择**：`npx create-expo-app`，TypeScript 模板，`expo-router` 文件路由。
- **理由**：内置 Android 构建（EAS）、`expo-av` / `expo-speech`、Web 开关成熟；降低 Gradle 维护成本。
- **替代**：裸 RN + 手动配 Metro — 灵活但初始化慢；Capacitor 继续 — 无法解决 WebView 问题。

### 2. 工程布局：`mobile/` 子目录

- **选择**：在仓库根目录新增 `mobile/`，保留原 `src/` 直至迁移验收后删除。
- **理由**：避免与 Vite 根 `package.json` 冲突；CI 可分别构建。
- **替代**：单体替换根 package — 破坏现有脚本，回滚难。

### 3. 路由与页面结构

- **选择**：`expo-router`：`app/index.tsx`（首页）、`app/animals/index.tsx`（列表+翻页）、`app/animals/[id].tsx` 或 Modal 组件（详情播放）。
- **理由**：与当前 `/`、`/animals`  mental model 一致。
- **替代**：React Navigation 手写 stack — 可行但 Expo 默认集成 router 更省事。

### 4. 列表交互：按钮翻页，禁止滑动手势翻页

- **选择**：`FlatList` 不适用整页滑动；使用 **分页状态 + 左右大按钮**（与现 Web 版一致），每页 8 项，`numColumns` 响应式（平板 3–4 列）。
- **理由**：儿童误触滑动问题已在 Web 版验证，RN 延续同一 UX。
- **替代**：`react-native-pager-view` 横滑 — 易回到敏感滑动问题。

### 5. 数据与资源

- **选择**：将 `animals.js` 转为 `mobile/src/data/animals.ts`；音频放入 `mobile/assets/sounds/`，通过 `require()` 或 `expo-asset` 映射 `animal.id → asset`。
- **理由**：RN 打包需静态或可解析的 asset 引用；保持 id 与文件名一致便于迁移脚本。
- **替代**：运行时从 `file://` 读 public — Expo 不推荐且路径脆。

### 6. 点击统计存储

- **选择**：`@react-native-async-storage/async-storage`，key `animal-click-stats`，排序逻辑移植自 `clickStatsService.js`。
- **理由**：与 `localStorage` API 接近，离线可靠。
- **替代**：MMKV — 性能更好但多依赖，当前数据量无需。

### 7. 音频与 TTS

- **选择**：
  - 主路径：`expo-av` 顺序播放 `tts/{id}.mp3` 再 `sounds/{file}`；
  - 兜底：`expo-speech`（`zh-CN`）当 TTS mp3 缺失；
  - 播放前统一 `stop()`，切换动物时取消上一轮（移植 token 模式）。
- **理由**：对齐现有 `audioService.js` 行为；Expo 模块在 Android 真机验证广。
- **替代**：`react-native-sound` — 维护活跃度低于 expo-av。

### 8. 开发预览（Web）

- **选择**：启用 `expo.web`，`package.json` 脚本 `"web": "expo start --web"`；文档标注 Web 仅用于布局/排序逻辑，**音频与未成年人模式必须 `expo run:android` 或 EAS APK**。
- **理由**：满足「RN 仍可网页预览」诉求，但不误导验收标准。
- **替代**：Storybook — 可补充，非 MVP。

### 9. Android 构建与家长模式

- **选择**：EAS Build `preview`/`production` profile；`app.json` 中 `android.package` 保持 `com.animal.app`（或延续现 applicationId）；**不声明多余网络权限**（离线应用）；应用名「动物乐园」。
- **理由**：与已讨论的 Capacitor 减敏策略一致。
- **替代**：本地 Gradle — Expo prebuild 仍可导出 `android/` 后本地打。

### 10. 旧栈处置

- **选择**：迁移验收通过后删除 Capacitor 相关依赖与 `android/`（Capacitor 产物），README 改为以 `mobile/` 为主。
- **理由**：避免双栈漂移。

## 风险 / 权衡

| 风险 | 缓解 |
|------|------|
| 音频资源体积大，APK 膨胀 | 仅打包已有 mp3/ogg；后续考虑 App Bundle 按需 |
| Expo Web 与 Android 播放行为不一致 | 规范 `dev-web-preview` 明确非目标；真机 checklist |
| `require()` 静态资源需生成映射表 | 脚本从 `animals.ts` 生成 sound manifest |
| 荣耀未成年人模式仍可能按应用类别限制 | 真机回归 + 家长白名单说明；原生已避开 WebView |
| 团队首次配 EAS/签名 | 文档记录 keystore 与 `eas.json` 示例 |
| 迁移期双 package 共存混乱 | `mobile/README` 与根 README 分述命令 |

## 迁移计划

1. 初始化 `mobile/` Expo 工程，配置 `app.json`、图标、包名。
2. 迁移数据与音频资源，实现共享排序/播放逻辑（TypeScript 纯函数）。
3. 实现页面与组件，对照 Web 版 UI 验收（翻页、Modal、播放链）。
4. Android 真机测试（含荣耀平板未成年人模式场景）。
5. 配置 EAS Build，产出 APK；更新 CI（若有）。
6. 移除 Capacitor/Vite 客户端代码与旧 `android/`，更新文档。

**回滚**：保留迁移前 git tag；若 RN 未通过验收，可继续用 Capacitor 分支发版。

## 待决问题

- 是否在首版保留 Vite Web 作为「家长电脑预览」—— 建议 **否**，仅 Expo Web，减少双 UI。
- EAS 账号与签名凭据是否已就绪（实现前由维护者确认）。
- 详情页用 **全屏 Modal** 还是 **独立路由页**（默认 Modal，与现 UX 一致）。
