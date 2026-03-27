# CursorProject

本仓库以 **一个分支一个独立项目** 的方式管理多个实验性项目。`master` 分支仅存放公共配置（如 GitHub Actions Workflow），各项目代码请切换到对应分支查看。

## 分支总览

| 分支 | 说明 |
|------|------|
| `master` | 默认分支，存放 GitHub Actions Workflow 定义和本文档 |
| `cloud-paste` | **剪贴板跨端共享**：Cloudflare Worker 后端 + Android 客户端，支持文本剪贴板在多设备间同步 |
| `family-tree` | 家谱 / 族谱相关项目 |
| `game_framework` | 游戏框架 |
| `linuxdo_daily` | LinuxDo 每日任务自动化 |
| `novel_download` | 小说下载工具 |
| `tic_tac_toe` | 井字棋游戏 |
| `wsforward` | WebSocket 转发服务 |

## GitHub Actions Workflows

Workflow 文件位于 `.github/workflows/`，在 `master` 分支上定义，可被 `master` 和各功能分支触发。

### Deploy Worker（部署 Cloudflare Worker）

- **文件**：`.github/workflows/deploy-worker.yml`
- **触发条件**：
  - 推送到 `master` 或 `cloud-paste` 分支，且 `worker/**` 路径有变更
  - 在 Actions 页面手动触发（`workflow_dispatch`）
- **作用**：自动部署 `worker/` 目录下的 Cloudflare Worker

### Build Android（构建 Android APK）

- **文件**：`.github/workflows/build-android.yml`
- **触发条件**：
  - 推送到 `master` 或 `cloud-paste` 分支，且 `android/**` 路径有变更
  - 在 Actions 页面手动触发（`workflow_dispatch`）
- **作用**：构建 debug APK 并上传到 Actions Artifacts（保留 30 天）

### 配置步骤

使用 Workflow 前，需要在 GitHub 仓库中配置以下 Secrets（Settings → Secrets and variables → Actions）：

| Secret 名称 | 用途 | 获取方式 |
|-------------|------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler 部署 Worker 的认证令牌 | [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens)，创建 Token 时选择 "Edit Cloudflare Workers" 模板 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | Cloudflare Dashboard 首页右侧栏，或任意 Workers 页面 URL 中的 ID |

### 首次部署前的准备

1. 在本地安装 Wrangler 并登录：
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. 创建 KV 命名空间（`cloud-paste` 分支 `worker/` 目录下执行）：
   ```bash
   npx wrangler kv:namespace create CLIPBOARD_KV
   ```
   将返回的 namespace ID 填入 `wrangler.toml` 中的 `id` 字段。

3. 设置 Worker 运行时密钥：
   ```bash
   npx wrangler secret put JWT_SECRET
   ```

4. 在 GitHub 仓库的 Settings → Secrets 中添加上述两个 Secret。

5. 推送代码到 `cloud-paste` 分支，或在 Actions 页面手动触发 Workflow。

### 手动触发

在 GitHub 仓库页面：**Actions** → 选择 Workflow → 右上角 **Run workflow** → 选择分支 → 点击运行。

> 注意：`workflow_dispatch` 按钮只有在 **默认分支**（`master`）上存在对应 Workflow 文件时才会显示，这也是 Workflow 文件放在 `master` 分支的原因。
