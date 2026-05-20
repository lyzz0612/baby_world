## 1. 工程初始化

- [x] 1.1 在 `mobile/` 使用 Expo TypeScript 模板创建工程，启用 `expo-router`
- [x] 1.2 配置 `app.json`：`name`/`slug` 为动物乐园，`android.package` 为 `com.animal.app`
- [x] 1.3 添加脚本：`android`（`expo run:android`）、`web`（`expo start --web`）、`start`
- [x] 1.4 安装核心依赖：`expo-av`、`expo-speech`、`@react-native-async-storage/async-storage`

## 2. 数据与资源迁移

- [x] 2.1 将 `src/data/animals.js` 迁移为 `mobile/src/data/animals.ts`（保留 id/name/category/emoji/sound）
- [x] 2.2 复制 `public/sounds/` 到 `mobile/assets/sounds/`（含 `tts/` 子目录）
- [x] 2.3 实现 `soundAssets.ts`（或生成脚本）建立 `animal.id` → `require(asset)` 映射
- [x] 2.4 移植 `clickStatsService` 为 `mobile/src/services/clickStats.ts`（AsyncStorage）

## 3. 核心服务

- [x] 3.1 实现 `audioService.ts`：token 取消、先 TTS mp3 再叫声、`expo-speech` 兜底
- [x] 3.2 实现 `sortAnimalsByClicks` 与列表分页工具（每页 8、chunk）
- [x] 3.3 为音频服务编写最小手动测试说明（Android 真机路径）

## 4. UI 与路由（rn-app-shell + animal-catalog）

- [x] 4.1 实现 `app/_layout.tsx`（主题色、安全区、Stack/Modal 配置）
- [x] 4.2 实现首页 `app/index.tsx`：标题、进入动物列表按钮
- [x] 4.3 实现 `AnimalCard` 组件（emoji、名称、大点击区）
- [x] 4.4 实现 `app/animals/index.tsx`：无分类 Tab、网格、`numColumns` 响应式
- [x] 4.5 实现翻页控件：左右大按钮、页码指示、禁用首/末页边界
- [x] 4.6 实现返回首页按钮

## 5. 详情与播放（animal-playback）

- [x] 5.1 实现动物详情 Modal（或路由页）：大图 emoji、名称、关闭按钮
- [x] 5.2 进入详情时自动调用 `audioService.playAnimalSound`
- [x] 5.3 实现「再听一次」按钮与播放中动效状态
- [x] 5.4 关闭详情时 `audioService.stop()` 并触发列表重排（animal-click-ranking）

## 6. 点击排序（animal-click-ranking）

- [x] 6.1 卡片点击时 `recordAnimalClick(animal.id)`
- [x] 6.2 关闭详情后 `setSortedAnimals(sortAnimalsByClicks(...))` 并校正 `pageIndex`
- [x] 6.3 验证：多次点击同一动物后其出现在更前页

## 7. Web 开发预览（dev-web-preview）

- [x] 7.1 验证 `npm run web` 可打开首页与动物列表
- [x] 7.2 在 `mobile/README.md` 写明 Web 预览范围与真机验收要求
- [x] 7.3 确保 Web 下详情打不开的音频失败不导致白屏

## 8. Android 构建与验收

- [x] 8.1 配置 `eas.json`（preview/production）或文档化本地 `expo prebuild` + 打包流程
- [ ] 8.2 产出 release/debug APK 并在 Android 平板安装运行
- [ ] 8.3 荣耀（或等价）未成年人模式真机验证：不以「打开网页」拦截
- [ ] 8.4 飞行模式下验证列表与本地音频可用

## 9. 清理旧栈

- [ ] 9.1 迁移验收通过后移除根目录 Capacitor 依赖与脚本
- [ ] 9.2 删除或归档旧 `android/`（Capacitor）与 Vite 客户端 `src/`（按团队决定保留 Web 与否）
- [x] 9.3 更新根 `README.md`：以 `mobile/` 为主的开发与构建说明
