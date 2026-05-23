# CI 构建加速方案

## 当前为什么这么慢

| 瓶颈 | 现状 | 影响 |
|------|------|------|
| Gradle 缓存 | `cache-disabled: true` **主动关闭** | 每次重新下依赖、编 native |
| NDK | 每次 prebuild 后重新下载 NDK 27 | ~2–4 分钟 |
| 架构 | 默认编 **4 个 ABI**（arm64/x86 等） | 编译时间 ×3~4 |
| prebuild | `expo prebuild --clean` 每次重建 `android/` | 无法复用 native 工程 |
| 触发 | 每次 push master 都跑完整 release | 失败也白等 |

RN/Expo **冷启动 release 构建 15–25 分钟** 在 GHA 上不算异常；关缓存 + 全 ABI 会拖到 30 分钟以上。

---

## 方案对比

### A. GHA 加缓存 + 单架构（推荐，已实施）

**改动小，继续用现有 R2 OTA 流程。**

- 开启 Gradle cache
- 缓存 `~/.gradle` + NDK 目录
- 只编 `arm64-v8a`（现代手机/平板够用）
- push 不再自动 release，改 **手动 / tag 触发**

**预期：**
- 首次：~15–20 分钟
- 后续：~6–10 分钟

### B. EAS Build（Expo 官方）

```yaml
eas build --platform android --profile production
```

- 云端预装 SDK/NDK，支持 **compiler cache（ccache）**
- 不用自己维护 Gradle patch
- 需要 Expo 账号 + `EXPO_TOKEN`，免费额度有限

**预期：** 有缓存后 ~5–12 分钟  
**代价：** 多一个服务；APK 从 EAS 下载再传 R2，或改用 EAS Update

### C. 更轻量：降级 AsyncStorage 2.x

- 去掉 v3 local_repo patch
- **几乎不省构建时间**，只减维护成本

### D. 拆分流水线

| Job | 触发 | 耗时 |
|-----|------|------|
| lint / typecheck | 每次 push | ~1 min |
| release APK | 手动 / tag | ~6–20 min |

日常开发不被打包拖慢。

---

## 建议路径

1. **现在**：用方案 A（workflow 已更新）
2. **若仍嫌慢**：上 EAS Build（方案 B）
3. **不要**：在本地跑 Gradle 验证（见 `.cursor/rules/ci-verification-only.mdc`）

## 手动触发 release

```bash
gh workflow run mobile-release.yml \
  -R lyzz0612/baby_world \
  -f version_name=1.0.0 \
  -f release_notes="首包"
```

或 push tag：`git tag v1.0.0 && git push origin v1.0.0`
