# 不编 C++ 的原型路径探索

> 背景：RN/Expo CI 每次 prebuild + NDK + 多 native 模块，冷启动 15–25 分钟不可接受。  
> 目标：给宝宝用的「认识动物」级原型，快速迭代，Acceptance 在荣耀平板未成年人模式下可用。

## 当前 App 实际有多复杂

| 能力 | 实现 |
|------|------|
| 页面 | 首页 + 动物网格（2 屏） |
| 交互 | 大按钮、翻页、点击播音频 |
| 音频 | 预置 mp3（TTS + 叫声），无实时合成依赖 |
| 存储 | 点击次数排序（key-value） |
| 更新 | R2 上 `latest.json` + APK OTA |

**结论：业务逻辑很轻，瓶颈在 RN 工具链，不在产品复杂度。**

## 为什么要离开 RN

RN/Expo Android 即使用户不写 C++，CI 仍会：

- `expo prebuild` 生成整棵 native 工程
- 拉 NDK、编 Hermes、编各 native module（Reanimated、async-storage…）
- 多 ABI 编译

这与「几个按钮 + 播 mp3」的需求严重不匹配。

---

## 方案对比

### 1. 纯 Web / PWA（零 native 编译）⭐ 原型首选

**做法：** Vite/React 或 Expo Web export → 静态文件部署到 `r2.skyup.top`

```text
git push → npm run build → aws s3 sync dist/ → 完成（1–3 分钟）
```

| 优点 | 缺点 |
|------|------|
| CI 极快，无 C++、无 NDK | 荣耀未成年人模式可能拦浏览器（需实测） |
| OTA = 换静态文件，秒级 | 无「安装到桌面」 unless PWA |
| 可复用现有 React 思路与资源 | 离线需 Service Worker（可加） |

**适用：** 先验证 2 岁宝宝 UX、音频、布局；再决定要不要 native 壳。

---

### 2. Kotlin + Jetpack Compose（轻量 native）⭐ 若 Web 被拦

**做法：** 单模块 Android 工程，`android/` **直接入仓**，不用 prebuild

| 优点 | 缺点 |
|------|------|
| 不写 C++；CI 通常 `./gradlew assembleRelease` 4–8 分钟 | 要重写 UI（约 2 屏，工作量可控） |
| 真 native，未成年人模式曾验证 RN 可行，Compose 同类 | 失去 React 生态 |
| 音频 `MediaPlayer` + assets，存储 `DataStore` | OTA 仍要 APK 流程 |
| 工程稳定，无 npm native 依赖地狱 | |

**适用：** Web 在荣耀上被拦、且确定长期走 APK 分发。

---

### 3. 回到 Capacitor / WebView 壳

| 优点 | 缺点 |
|------|------|
| Web 技术栈，CI 比 RN 轻（无 NDK 多模块） | **已证实**：荣耀未成年人模式识别为 WebView 拦截 |
| Gradle 只编 Java 壳 + 打 zip 资源 | 滑动/点击与 Web 事件冲突（原 PRD 提过） |

**结论：** 除非荣耀策略变化，否则 **不推荐** 作为宝宝平板主路径。

---

### 4. Flutter

写 Dart，但引擎仍编 C++，CI 不比 RN 轻。

**结论：** 跳过。

---

### 5. EAS Build（仍 RN，只是换地方编）

不减少「编 native」本质，只把慢从 GHA 挪到 Expo 云。

**结论：** 解决「谁跑 Gradle」，不解决「要不要 RN 栈」。

---

### 6. 继续 RN，仅 Web 预览 + 极少发 APK

日常 `npm run web`；APK 每月手发一次 EAS。

**结论：** 原型阶段可凑合；CI 痛点仍在发版日。

---

## 决策树

```text
能在荣耀未成年人模式下用浏览器/PWA 吗？
├─ 是 → 纯 Web 原型（方案 1）
│        CI: 静态站上传 R2，1–3 分钟
└─ 否 → 需要 native APK
         └─ Kotlin Compose（方案 2）
              CI: 单 Gradle 工程，4–8 分钟
              不要 RN
```

**必须先做：** 在宝宝平板上测 `https://r2.skyup.top/...` 静态页是否被拦。

---

## 推荐落地路线

### 阶段 A：Web 原型（1–2 天）

```
baby_world/
├── shared/           # animals.json + sounds/（与端无关）
├── web/              # Vite + React，读 shared
└── mobile/           # 现有 RN，暂停投入 CI
```

- Action：`.github/workflows/web-deploy.yml`  
  `npm ci && npm run build && s3 sync` → R2  
- 宝宝测：布局、音频、误触、翻页

### 阶段 B：荣耀实测

- 浏览器直接打开
- 「添加到主屏幕」PWA
- 记录：能否用、是否被 minors mode 拦

### 阶段 C：分支

| 实测结果 | 下一步 |
|----------|--------|
| Web 可用 | 继续 Web + PWA，RN 归档 |
| Web 被拦 | 新建 `android/` Compose，复用 `shared/` 资源 |
| Web 可用但想要桌面图标 | TWA 或极简 Kotlin 壳只包 WebView（仍有被拦风险） |

---

## CI 耗时对比（量级）

| 路径 | 典型 CI | 编 C++ |
|------|---------|--------|
| Web → R2 | **1–3 min** | 否 |
| Kotlin Compose | **4–8 min** | 否（纯 Kotlin） |
| Capacitor | 5–10 min | 几乎否 |
| RN/Expo（现状） | **15–25 min** | 是（工具链） |

---

## 与现有 OTA 的关系

| 路径 | OTA 方式 |
|------|----------|
| Web | 更新 R2 静态文件；可选 SW 缓存 bust |
| Kotlin | 保留现有 `latest.json` + APK |
| RN | 保留现有方案（若继续） |

Web 原型甚至 **不需要 APK OTA**，发版即上传目录。

---

## 建议

1. **短期：** 暂停 RN CI 投入，做 **Web 原型 + 静态部署 Action**（最快验证）  
2. **实测荣耀平板** 后再决定是否 **Kotlin Compose**  
3. **共享资源层** `shared/`，避免第三套数据  
4. RN `mobile/` 保留但不删，作参考实现；确认路径后再归档

如需实施，优先：`shared/` + `web/` + `web-deploy.yml`（不动 secrets 结构，R2 路径加 `app/` 前缀即可）。
