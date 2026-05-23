/**
 * 在 `expo prebuild --platform android` 之后，向 android/build.gradle 注入
 * @react-native-async-storage/async-storage v3 所需的 local Maven 仓库。
 *
 * v3 依赖 org.asyncstorage.shared_storage:storage-android:1.0.0，
 * 该产物不在 Maven Central，只随 npm 包发布在 android/local_repo/。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildGradle = path.resolve(__dirname, '../android/build.gradle');

if (!fs.existsSync(buildGradle)) {
  console.error(
    `[patch-android-async-storage] not found: ${buildGradle}\n` +
      '  Run `npx expo prebuild --platform android` first.'
  );
  process.exit(1);
}

const marker = "@react-native-async-storage/async-storage/android/local_repo";
let src = fs.readFileSync(buildGradle, 'utf8');
const before = src;

if (src.includes(marker)) {
  console.log('[patch-android-async-storage] no change needed');
  process.exit(0);
}

const mavenLine =
  "    maven { url \"${rootProject.projectDir}/../node_modules/@react-native-async-storage/async-storage/android/local_repo\" }";

if (src.includes("maven { url 'https://www.jitpack.io' }")) {
  src = src.replace(
    "maven { url 'https://www.jitpack.io' }",
    `maven { url 'https://www.jitpack.io' }\n${mavenLine}`
  );
} else if (src.includes("$rootDir/../node_modules/@react-native-async-storage/async-storage/android/local_repo")) {
  src = src.replace(
    "maven { url '$rootDir/../node_modules/@react-native-async-storage/async-storage/android/local_repo' }",
    mavenLine.trim()
  );
} else {
  src = src.replace(
    /allprojects\s*\{\s*repositories\s*\{/,
    (match) => `${match}\n${mavenLine}`
  );
}

if (src === before) {
  console.error('[patch-android-async-storage] failed to patch build.gradle');
  process.exit(1);
}

fs.writeFileSync(buildGradle, src, 'utf8');
console.log(`[patch-android-async-storage] patched ${buildGradle}`);
