#!/usr/bin/env bash
# 从本地 secrets.local.json 写入 GitHub Actions Secrets。
# 用法:
#   cp .github/secrets.local.template.json .github/secrets.local.json
#   # 编辑 .github/secrets.local.json，填入密钥
#   bash .github/scripts/upload-github-secrets.sh
#
# 可选: bash .github/scripts/upload-github-secrets.sh /path/to/secrets.local.json
#
# 注意: secrets.local.json 已在 .gitignore 中，切勿提交。

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SECRETS_FILE="${1:-${ROOT}/.github/secrets.local.json}"

if [[ ! -f "$SECRETS_FILE" ]]; then
  echo "找不到配置文件: $SECRETS_FILE" >&2
  echo "请先复制模板:" >&2
  echo "  cp .github/secrets.local.template.json .github/secrets.local.json" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "需要 jq，请先安装" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "需要 GitHub CLI (gh)，请先安装并 gh auth login" >&2
  exit 1
fi

contains_placeholder() {
  jq -r '.. | strings' "$SECRETS_FILE" | grep -q '在此填写' && return 0
  return 1
}

if contains_placeholder; then
  echo "配置里仍有「在此填写」占位符，请先编辑 $SECRETS_FILE" >&2
  exit 1
fi

REPO="$(jq -r '.github.repo // empty' "$SECRETS_FILE")"
if [[ -z "$REPO" ]]; then
  echo "缺少 github.repo" >&2
  exit 1
fi

KEYSTORE_PATH="$(jq -r '.androidSigning.keystorePath // empty' "$SECRETS_FILE")"
if [[ -z "$KEYSTORE_PATH" ]]; then
  echo "缺少 androidSigning.keystorePath" >&2
  exit 1
fi
if [[ "$KEYSTORE_PATH" != /* ]]; then
  KEYSTORE_PATH="${ROOT}/${KEYSTORE_PATH}"
fi
if [[ ! -f "$KEYSTORE_PATH" ]]; then
  echo "keystore 文件不存在: $KEYSTORE_PATH" >&2
  exit 1
fi

APP_RELEASE_CONFIG="$(jq -c '.appReleaseConfig' "$SECRETS_FILE")"
KEYSTORE_PASSWORD="$(jq -r '.androidSigning.keystorePassword' "$SECRETS_FILE")"
KEY_ALIAS="$(jq -r '.androidSigning.keyAlias' "$SECRETS_FILE")"
KEY_PASSWORD="$(jq -r '.androidSigning.keyPassword' "$SECRETS_FILE")"
KEYSTORE_B64="$(base64 -w0 "$KEYSTORE_PATH" 2>/dev/null || base64 "$KEYSTORE_PATH" | tr -d '\n')"

echo "目标仓库: $REPO"
echo "CDN: $(jq -r '.appReleaseConfig.cdn.baseUrl' "$SECRETS_FILE")"
echo "R2 bucket: $(jq -r '.appReleaseConfig.r2.bucket' "$SECRETS_FILE")"
echo "Keystore: $KEYSTORE_PATH"
echo ""
echo "即将写入 5 个 GitHub Secrets（不会打印密钥内容）..."

gh secret set APP_RELEASE_CONFIG --repo "$REPO" --body "$APP_RELEASE_CONFIG"
gh secret set ANDROID_RELEASE_KEYSTORE --repo "$REPO" --body "$KEYSTORE_B64"
gh secret set ANDROID_KEYSTORE_PASSWORD --repo "$REPO" --body "$KEYSTORE_PASSWORD"
gh secret set ANDROID_KEY_ALIAS --repo "$REPO" --body "$KEY_ALIAS"
gh secret set ANDROID_KEY_PASSWORD --repo "$REPO" --body "$KEY_PASSWORD"

echo ""
echo "完成。可在 GitHub 仓库 Settings → Secrets and variables → Actions 确认。"
echo "首次发布: Actions → Release Baby World App to R2 → Run workflow → version_name 填 1.0.0"
