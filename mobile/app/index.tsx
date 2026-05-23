import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from '@/components/ScreenBackground';
import { colors } from '@/src/theme/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height && height < 500;
  const isTablet = Math.min(width, height) >= 600;

  // logo 持续 bounce 动画，对应 web 端 .logo 的 @keyframes bounce
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
    outputRange: [0, -20],
  });

  const sizes = {
    logo: isLandscape ? 56 : isTablet ? 120 : 84,
    title: isLandscape ? 28 : isTablet ? 60 : 40,
    subtitle: isLandscape ? 14 : isTablet ? 24 : 18,
    cardIcon: isLandscape ? 40 : isTablet ? 80 : 56,
    cardTitle: isLandscape ? 18 : isTablet ? 28 : 22,
    cardDesc: isLandscape ? 12 : isTablet ? 18 : 14,
    cardPaddingV: isLandscape ? 18 : isTablet ? 48 : 32,
    headerMb: isLandscape ? 16 : isTablet ? 56 : 36,
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { marginBottom: sizes.headerMb }]}>
          <Animated.Text
            style={[
              styles.logo,
              { fontSize: sizes.logo, lineHeight: sizes.logo + 6, transform: [{ translateY }] },
            ]}
          >
            🎨
          </Animated.Text>
          <Text style={[styles.title, { fontSize: sizes.title, lineHeight: sizes.title * 1.1 }]}>
            宝宝世界
          </Text>
          <Text style={[styles.subtitle, { fontSize: sizes.subtitle }]}>
            学习玩耍，快乐成长～
          </Text>
        </View>

        <View style={[styles.grid, isLandscape && styles.gridLandscape]}>
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.cardActive,
              { paddingVertical: sizes.cardPaddingV },
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/animals')}
          >
            <Text style={[styles.cardIcon, { fontSize: sizes.cardIcon }]}>🐾</Text>
            <Text style={[styles.cardTitle, { fontSize: sizes.cardTitle }]}>认识动物</Text>
            <Text style={[styles.cardDesc, { fontSize: sizes.cardDesc }]}>
              去认识各种小动物吧！
            </Text>
          </Pressable>

          <View
            style={[
              styles.card,
              styles.cardDisabled,
              { paddingVertical: sizes.cardPaddingV },
            ]}
          >
            <Text style={[styles.cardIcon, { fontSize: sizes.cardIcon }]}>🚀</Text>
            <Text
              style={[
                styles.cardTitle,
                styles.cardTitleMuted,
                { fontSize: sizes.cardTitle },
              ]}
            >
              更多功能
            </Text>
            <Text style={[styles.cardDescMuted, { fontSize: sizes.cardDesc }]}>
              即将推出...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
  },
  logo: {
    marginBottom: 8,
  },
  title: {
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
    // 对应 web 端 text-shadow: 3px 3px 0px #FFE66D
    textShadowColor: '#FFE66D',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  subtitle: {
    color: colors.primaryLight,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  gridLandscape: {
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: 180,
    maxWidth: 320,
    borderRadius: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  cardActive: {
    backgroundColor: colors.primaryLight,
  },
  cardDisabled: {
    backgroundColor: '#e0e0e0',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  cardTitleMuted: {
    color: '#757575',
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  cardDescMuted: {
    color: '#757575',
    textAlign: 'center',
  },
});
