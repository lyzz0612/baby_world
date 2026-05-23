import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from '@/components/ScreenBackground';
import { colors } from '@/src/theme/colors';

const APP_ICON = require('@/assets/images/icon.png');

type AppModule = {
  id: string;
  title: string;
  icon: string;
  color: string;
  route?: string;
  disabled?: boolean;
};

const APP_MODULES: AppModule[] = [
  {
    id: 'animals',
    title: '认识动物',
    icon: '🐾',
    color: colors.primaryLight,
    route: '/animals',
  },
  {
    id: 'family',
    title: '称呼叫声',
    icon: '👨‍👩‍👧',
    color: '#FFD6A5',
    route: '/family',
  },
  {
    id: 'more',
    title: '更多功能',
    icon: '🚀',
    color: '#e0e0e0',
    disabled: true,
  },
];

function getColumnCount(width: number, isLandscape: boolean): number {
  if (width >= 900) return isLandscape ? 5 : 4;
  if (width >= 600) return isLandscape ? 4 : 3;
  return isLandscape ? 3 : 2;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = Math.min(width, height) >= 600;

  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  const translateY = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const columns = getColumnCount(width, isLandscape);
  const contentMaxWidth = isTablet ? 920 : width;
  const horizontalPadding = isTablet ? 32 : 20;
  const gap = isTablet ? 24 : 16;
  const gridInnerWidth = Math.min(width, contentMaxWidth) - horizontalPadding * 2;
  const tileSize = (gridInnerWidth - gap * (columns - 1)) / columns;

  const sizes = useMemo(
    () => ({
      appIcon: isTablet ? 88 : 72,
      title: isTablet ? 34 : 28,
      subtitle: isTablet ? 18 : 15,
      tileIcon: isTablet ? 56 : 44,
      tileLabel: isTablet ? 18 : 15,
      topBarTitle: isTablet ? 28 : 22,
      settingsBtn: isTablet ? 52 : 44,
    }),
    [isTablet]
  );

  const handleModulePress = (module: AppModule) => {
    if (module.disabled || !module.route) return;
    router.push(module.route as '/animals' | '/family');
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
          <Text style={[styles.topBarTitle, { fontSize: sizes.topBarTitle }]}>宝宝世界</Text>
          <Pressable
            style={({ pressed }) => [
              styles.settingsButton,
              { width: sizes.settingsBtn, height: sizes.settingsBtn, borderRadius: sizes.settingsBtn / 2 },
              pressed && styles.settingsPressed,
            ]}
            onPress={() => router.push('/settings')}
            accessibilityLabel="设置"
            hitSlop={8}
          >
            <FontAwesome name="cog" size={isTablet ? 26 : 22} color="#666" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { marginBottom: isTablet ? 36 : 24 }]}>
            <Animated.View style={{ transform: [{ translateY }] }}>
              <Image
                source={APP_ICON}
                style={[
                  styles.heroIcon,
                  { width: sizes.appIcon, height: sizes.appIcon, borderRadius: sizes.appIcon * 0.22 },
                ]}
              />
            </Animated.View>
            <Text style={[styles.heroTitle, { fontSize: sizes.title }]}>宝宝世界</Text>
            <Text style={[styles.heroSubtitle, { fontSize: sizes.subtitle }]}>
              学习玩耍，快乐成长～
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { fontSize: isTablet ? 16 : 14 }]}>应用</Text>

          <View style={[styles.grid, { gap, width: gridInnerWidth }]}>
            {APP_MODULES.map((module) => (
              <Pressable
                key={module.id}
                style={({ pressed }) => [
                  styles.tile,
                  { width: tileSize },
                  module.disabled && styles.tileDisabled,
                  pressed && !module.disabled && styles.tilePressed,
                ]}
                onPress={() => handleModulePress(module)}
                disabled={module.disabled}
                accessibilityLabel={module.title}
              >
                <View
                  style={[
                    styles.tileIconWrap,
                    {
                      width: tileSize - (isTablet ? 20 : 16),
                      height: tileSize - (isTablet ? 20 : 16),
                      backgroundColor: module.color,
                    },
                  ]}
                >
                  <Text style={{ fontSize: sizes.tileIcon }}>{module.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.tileLabel,
                    { fontSize: sizes.tileLabel },
                    module.disabled && styles.tileLabelDisabled,
                  ]}
                  numberOfLines={2}
                >
                  {module.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
  },
  topBarTitle: {
    fontWeight: '800',
    color: colors.primary,
  },
  settingsButton: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsPressed: {
    opacity: 0.85,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 8,
  },
  heroIcon: {
    marginBottom: 12,
  },
  heroTitle: {
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 6,
    textShadowColor: '#FFE66D',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  heroSubtitle: {
    color: colors.primaryLight,
    textAlign: 'center',
  },
  sectionLabel: {
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 16,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    alignItems: 'center',
    marginBottom: 8,
  },
  tileIconWrap: {
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  tileDisabled: {
    opacity: 0.55,
  },
  tilePressed: {
    transform: [{ scale: 0.96 }],
  },
  tileLabel: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  tileLabelDisabled: {
    color: colors.textMuted,
  },
});
