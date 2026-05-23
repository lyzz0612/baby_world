import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { checkForUpdate } from '@/src/services/updateChecker';
import { colors } from '@/src/theme/colors';

const APP_ICON = require('@/assets/images/icon.png');

export default function SettingsScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const versionName = Application.nativeApplicationVersion ?? '未知';
  const versionCode = Application.nativeBuildVersion ?? '—';

  const goHome = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleCheckUpdate = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await checkForUpdate({ manual: true });
    } finally {
      setChecking(false);
    }
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
          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              pressed && !checking && styles.actionRowPressed,
              checking && styles.actionRowDisabled,
            ]}
            onPress={() => void handleCheckUpdate()}
            disabled={checking}
            accessibilityLabel="检测更新"
          >
            <View style={styles.actionLeft}>
              <FontAwesome name="refresh" size={20} color={colors.primary} />
              <Text style={styles.actionLabel}>检测更新</Text>
            </View>
            {checking ? (
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
