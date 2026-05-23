import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Application from 'expo-application';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from '@/components/ScreenBackground';
import {
  checkForUpdate,
  continueUpdateDownload,
  forceRedownloadUpdate,
  installPendingUpdate,
  openUpdateDownloadInBrowser,
  pauseActiveDownloadForResume,
  resumePendingDownload,
  retryFailedDownload,
  subscribeUpdateUi,
  syncPendingUpdateUi,
} from '@/src/services/updateChecker';
import type { UpdateUiSnapshot } from '@/src/services/updateStore';
import { colors } from '@/src/theme/colors';

const APP_ICON = require('@/assets/images/icon.png');

function UpdateStatusCard({
  ui,
  onInstall,
  onContinue,
  onRetry,
  onForceRedownload,
  onBrowserDownload,
}: {
  ui: UpdateUiSnapshot;
  onInstall: () => void;
  onContinue: () => void;
  onRetry: () => void;
  onForceRedownload: () => void;
  onBrowserDownload: () => void;
}) {
  if (ui.phase === 'idle' || ui.phase === 'checking') return null;

  const progressPct =
    ui.progress != null && ui.progress >= 0
      ? Math.min(100, Math.round(ui.progress * 100))
      : null;

  return (
    <View style={styles.statusCard}>
      {ui.phase === 'downloading' && (
        <>
          <Text style={styles.statusTitle}>
            正在下载 {ui.versionName ?? '新版本'}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPct ?? 8}%` },
                progressPct == null && styles.progressFillIndeterminate,
              ]}
            />
          </View>
          <Text style={styles.statusHint}>
            {ui.message ?? '下载中…'}
            {ui.downloadActive ? ' 离开本页会自动保存进度' : ''}
          </Text>
          {ui.phase === 'downloading' && !ui.downloadActive && (
            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, styles.buttonHalf, pressed && styles.buttonPressed]}
                onPress={onContinue}
              >
                <Text style={styles.secondaryButtonText}>继续下载</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, styles.buttonHalf, pressed && styles.buttonPressed]}
                onPress={onForceRedownload}
              >
                <Text style={styles.secondaryButtonText}>重新下载</Text>
              </Pressable>
            </View>
          )}
          {(ui.phase === 'downloading' || ui.phase === 'failed') && (
            <Pressable
              style={({ pressed }) => [styles.fallbackButton, pressed && styles.buttonPressed]}
              onPress={onBrowserDownload}
            >
              <Text style={styles.fallbackButtonText}>浏览器下载（保底）</Text>
            </Pressable>
          )}
        </>
      )}

      {ui.phase === 'ready' && (
        <>
          <Text style={styles.statusTitle}>新版本 {ui.versionName} 已就绪</Text>
          <Text style={styles.statusHint}>下载完成，可直接安装</Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={onInstall}
          >
            <Text style={styles.primaryButtonText}>立即安装</Text>
          </Pressable>
        </>
      )}

      {ui.phase === 'failed' && (
        <>
          <Text style={styles.statusTitle}>更新下载失败</Text>
          <Text style={styles.statusHint}>{ui.message ?? '请检查网络后重试'}</Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={onRetry}
          >
            <Text style={styles.primaryButtonText}>重新下载</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.fallbackButton, pressed && styles.buttonPressed]}
            onPress={onBrowserDownload}
          >
            <Text style={styles.fallbackButtonText}>浏览器下载（保底）</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [ui, setUi] = useState<UpdateUiSnapshot>({ phase: 'idle' });

  const versionName = Application.nativeApplicationVersion ?? '未知';
  const versionCode = Application.nativeBuildVersion ?? '—';

  useEffect(() => subscribeUpdateUi(setUi), []);

  useFocusEffect(
    useCallback(() => {
      void syncPendingUpdateUi();
      void resumePendingDownload();
      return () => {
        void pauseActiveDownloadForResume();
      };
    }, [])
  );

  const goHome = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const isBusy = ui.phase === 'checking' || ui.phase === 'downloading';

  const handleCheckUpdate = async () => {
    await checkForUpdate({ manual: true });
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
            onPress={goHome}
            accessibilityLabel="返回首页"
            hitSlop={8}
          >
            <FontAwesome name="chevron-left" size={22} color="#666" />
          </Pressable>
          <Text style={styles.pageTitle}>设置</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>
          <View style={styles.aboutCard}>
            <Image source={APP_ICON} style={styles.appIcon} />
            <Text style={styles.appName}>宝宝世界</Text>
            <Text style={styles.versionText}>
              版本 {versionName}
              {Platform.OS === 'android' ? ` (${versionCode})` : ''}
            </Text>
            <Text style={styles.aboutDesc}>
              面向宝宝的启蒙应用，通过认识动物等方式快乐学习、健康成长。
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>更新</Text>
          <UpdateStatusCard
            ui={ui}
            onInstall={() => void installPendingUpdate()}
            onContinue={() => void continueUpdateDownload()}
            onRetry={() => void retryFailedDownload()}
            onForceRedownload={() => void forceRedownloadUpdate()}
            onBrowserDownload={() => void openUpdateDownloadInBrowser(ui.downloadUrl)}
          />
          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              pressed && !isBusy && styles.actionRowPressed,
              isBusy && styles.actionRowDisabled,
            ]}
            onPress={() => void handleCheckUpdate()}
            accessibilityLabel="检测更新"
          >
            <View style={styles.actionLeft}>
              <FontAwesome name="refresh" size={20} color={colors.primary} />
              <Text style={styles.actionLabel}>
                {ui.phase === 'checking'
                  ? '正在检查…'
                  : ui.phase === 'downloading'
                    ? '正在下载…'
                    : '检测更新'}
              </Text>
            </View>
            {isBusy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <FontAwesome name="chevron-right" size={16} color={colors.textMuted} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backPressed: {
    opacity: 0.85,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    marginLeft: 4,
  },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  appIcon: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 6,
  },
  versionText: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 16,
  },
  aboutDesc: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  statusHint: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8F5E9',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressFillIndeterminate: {
    opacity: 0.55,
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  buttonHalf: {
    flex: 1,
    marginTop: 0,
  },
  fallbackButton: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  fallbackButtonText: {
    color: '#E65100',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  actionRowPressed: {
    opacity: 0.85,
  },
  actionRowDisabled: {
    opacity: 0.7,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
});
