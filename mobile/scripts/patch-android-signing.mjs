/**
 * 在 `expo prebuild --platform android` 之后，把生成的 mobile/android/app/build.gradle 的
 * release 构建类型签名指向真实的 release keystore，并通过环境变量读取证书信息。
 *
 * Expo / React Native 默认模板里 release buildType 用 debug 签名，无法上线。
 * 这里仅做最小侵入式修改：
 *   1. 在 signingConfigs { } 里追加 `release` 子块（若缺失），从环境变量读取证书路径与密码
 *   2. 把 buildTypes.release 的 signingConfig 从 .debug 改为 .release（若仍是 debug）
 *
 * 环境变量：ANDROID_KEYSTORE_PATH / KEYSTORE_PASSWORD / KEY_ALIAS / KEY_PASSWORD
 * 沿用旧 Capacitor `app-release.yml` 同一组 GitHub Secrets。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildGradle = path.resolve(__dirname, '../android/app/build.gradle');

if (!fs.existsSync(buildGradle)) {
  console.error(
    `[patch-android-signing] not found: ${buildGradle}\n` +
      '  Run `npx expo prebuild --platform android` first.'
  );
  process.exit(1);
}

let src = fs.readFileSync(buildGradle, 'utf8');
const before = src;

const releaseSnippet = [
  '',
  '        release {',
  "            def keystorePath = System.getenv('ANDROID_KEYSTORE_PATH')",
  "            if (keystorePath != null && file(keystorePath).exists()) {",
  '                storeFile file(keystorePath)',
  "                storePassword System.getenv('KEYSTORE_PASSWORD') ?: ''",
  "                keyAlias System.getenv('KEY_ALIAS') ?: ''",
  "                keyPassword System.getenv('KEY_PASSWORD') ?: ''",
  '            }',
  '        }',
  '',
].join('\n');

if (!/signingConfigs\s*\{[^}]*\brelease\s*\{/m.test(src)) {
  src = src.replace(/signingConfigs\s*\{/, (m) => `${m}${releaseSnippet}`);
}

src = src.replace(
  /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.)debug/m,
  '$1release'
);

if (src === before) {
  console.log('[patch-android-signing] no change needed');
} else {
  fs.writeFileSync(buildGradle, src, 'utf8');
  console.log(`[patch-android-signing] patched ${buildGradle}`);
}
