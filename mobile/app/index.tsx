import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from '@/components/ScreenBackground';
import { colors } from '@/src/theme/colors';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.logo}>🎨</Text>
          <Text style={styles.title}>动物乐园</Text>
          <Text style={styles.subtitle}>和小动物们做朋友吧～</Text>
        </View>

        <View style={styles.grid}>
          <Pressable
            style={({ pressed }) => [styles.card, styles.cardActive, pressed && styles.pressed]}
            onPress={() => router.push('/animals')}
          >
            <Text style={styles.cardIcon}>🐾</Text>
            <Text style={styles.cardTitle}>认识动物</Text>
            <Text style={styles.cardDesc}>去认识各种小动物吧！</Text>
          </Pressable>

          <View style={[styles.card, styles.cardDisabled]}>
            <Text style={styles.cardIcon}>🚀</Text>
            <Text style={[styles.cardTitle, styles.cardTitleMuted]}>更多功能</Text>
            <Text style={styles.cardDescMuted}>即将推出...</Text>
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
    marginBottom: 48,
  },
  logo: {
    fontSize: 96,
    marginBottom: 12,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: colors.primaryLight,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    minWidth: 200,
    maxWidth: 320,
    borderRadius: 24,
    paddingVertical: 36,
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
    fontSize: 64,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  cardTitleMuted: {
    color: '#757575',
  },
  cardDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  cardDescMuted: {
    fontSize: 15,
    color: '#757575',
  },
});
