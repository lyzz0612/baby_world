# Animal App — Release & Auto-Update

## GitHub Secrets

### `APP_RELEASE_CONFIG` (JSON)

Single secret for R2/CDN paths. Example (copy to repo secret; use real values):

```json
{
  "r2": {
    "endpoint": "https://<account_id>.r2.cloudflarestorage.com",
    "bucket": "your-bucket",
    "accessKeyId": "...",
    "secretAccessKey": "..."
  },
  "cdn": {
    "baseUrl": "https://download.example.com"
  },
  "paths": {
    "latestJson": "update/latest.json",
    "apk": "update/app-release.apk"
  },
  "appUpdate": {
    "minSupport": 1
  }
}
```

See [docs/app-release-config.example.json](app-release-config.example.json).

### Release signing (separate secrets)

| Secret | Description |
|--------|-------------|
| `ANDROID_RELEASE_KEYSTORE` | Base64-encoded `.jks` / `.keystore` file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |

Generate base64 locally: `base64 -w0 release.keystore` (Linux) or `[Convert]::ToBase64String([IO.File]::ReadAllBytes('release.keystore'))` (PowerShell).

## Cloudflare R2

1. Create an R2 bucket and enable public access via a custom domain (HTTPS).
2. Create R2 API token (Object Read & Write) and map `accessKeyId` / `secretAccessKey` into `APP_RELEASE_CONFIG`.
3. Bind custom domain to the bucket; set `cdn.baseUrl` to that origin (no trailing slash).
4. Ensure `update/latest.json` and `update/app-release.apk` are reachable at `{baseUrl}/update/...`.

## Workflows

| Workflow | Trigger | Output |
|----------|---------|--------|
| [animal-app.yml](../.github/workflows/animal-app.yml) | `push` → `feature/animal-learning`, `workflow_dispatch` | Debug APK artifact |
| [app-release.yml](../.github/workflows/app-release.yml) | `push` branch/tag `v*`, `workflow_dispatch` | Release APK + R2 manifest |

### First release (baseline)

1. Configure secrets and R2 as above.
2. Run **Release Animal App to R2** → `workflow_dispatch` with `version_name` = `1.0.0`.
3. Install the produced APK on devices (sideload baseline).
4. Merge AppUpdate client build; subsequent branch pushes auto-increment PATCH.

### Version rules

- `versionCode = MAJOR×1_000_000 + MINOR×10_000 + PATCH`
- Branch `push` → read R2 `latest.json`, `PATCH + 1`
- Tag `v1.2.0` → `versionName` = `1.2.0`
- `workflow_dispatch` → use input `version_name`

## Verification checklist

### 5.1 Branch push → R2

- [ ] Push to `feature/animal-learning` with `APP_RELEASE_CONFIG` set.
- [ ] Confirm `update/latest.json` PATCH incremented and `update/app-release.apk` downloads over HTTPS.

### 5.2 Tag release

- [ ] Push tag `v1.1.0`; confirm `versionName` is `1.1.0` and `versionCode` = `1×1_000_000 + 1×10_000 + 0`.

### 5.3 Client auto-update

- [ ] Install an older APK (lower `versionCode`).
- [ ] Host or edit R2 `latest.json` with higher `versionCode` and valid `url`.
- [ ] Cold-start app; update dialog appears and APK installs.

### 2.3 Local / staging check (without R2)

Use a static `latest.json` on any HTTPS host:

```json
{
  "versionCode": 999,
  "versionName": "9.9.9",
  "content": "Test#Line2",
  "minSupport": 1,
  "url": "https://your-cdn/update/app-release.apk"
}
```

Build with a matching check URL:

```bash
cd android && ./gradlew assembleDebug \
  -PUPDATE_CHECK_URL=https://your-host/latest.json
```

Install the debug APK; on launch, AppUpdate should prompt when remote `versionCode` exceeds the installed build.
