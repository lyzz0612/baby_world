import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimalCard } from '@/components/AnimalCard';
import { AnimalModal } from '@/components/AnimalModal';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ANIMALS, type Animal } from '@/src/data/animals';
import { recordAnimalClick, sortAnimalsByClicks } from '@/src/services/clickStats';
import { colors } from '@/src/theme/colors';
import { chunk, ITEMS_PER_PAGE } from '@/src/utils/pagination';

export default function AnimalsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const numColumns = width >= 900 ? 4 : width >= 600 ? 3 : 2;

  const [sortedAnimals, setSortedAnimals] = useState<Animal[]>(ANIMALS);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [ready, setReady] = useState(false);

  const refreshSort = useCallback(async () => {
    const sorted = await sortAnimalsByClicks(ANIMALS);
    setSortedAnimals(sorted);
    const total = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
    setPageIndex((i) => Math.min(i, total - 1));
  }, []);

  useEffect(() => {
    refreshSort().finally(() => setReady(true));
  }, [refreshSort]);

  const pages = useMemo(
    () => chunk(sortedAnimals, ITEMS_PER_PAGE),
    [sortedAnimals]
  );
  const totalPages = pages.length;
  const safePageIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));
  const pageAnimals = pages[safePageIndex] ?? [];

  const goPrev = () => setPageIndex((i) => Math.max(0, i - 1));
  const goNext = () => setPageIndex((i) => Math.min(totalPages - 1, i + 1));

  /** 先开弹窗，再后台落盘，保证点击即时响应 */
  const handleAnimalPress = (animal: Animal) => {
    setSelectedAnimal(animal);
    recordAnimalClick(animal.id);
  };

  const handleModalClose = async () => {
    setSelectedAnimal(null);
    await refreshSort();
  };

  const goHome = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (!ready) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safe} />
      </ScreenBackground>
    );
  }

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
          <Text style={styles.pageTitle}>认识动物</Text>
        </View>

        <View style={styles.pager}>
          <Pressable
            style={({ pressed }) => [
              styles.pageNav,
              safePageIndex === 0 && styles.pageNavDisabled,
              pressed && safePageIndex !== 0 && styles.pageNavPressed,
            ]}
            onPress={goPrev}
            disabled={safePageIndex === 0}
            accessibilityLabel="上一页"
            hitSlop={8}
          >
            <FontAwesome name="chevron-left" size={28} color={colors.primary} />
          </Pressable>

          <View style={styles.grid}>
            {pageAnimals.map((animal) => (
              <View
                key={animal.id}
                style={[styles.gridItem, { width: `${100 / numColumns}%` }]}
              >
                <AnimalCard animal={animal} onPress={() => handleAnimalPress(animal)} />
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.pageNav,
              safePageIndex >= totalPages - 1 && styles.pageNavDisabled,
              pressed && safePageIndex < totalPages - 1 && styles.pageNavPressed,
            ]}
            onPress={goNext}
            disabled={safePageIndex >= totalPages - 1}
            accessibilityLabel="下一页"
            hitSlop={8}
          >
            <FontAwesome name="chevron-right" size={28} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.dots}>
          {pages.map((_, idx) => (
            <Pressable
              key={idx}
              style={[styles.dot, idx === safePageIndex && styles.dotActive]}
              onPress={() => setPageIndex(idx)}
              accessibilityLabel={`第 ${idx + 1} 页`}
              hitSlop={8}
            />
          ))}
        </View>

        <Text style={styles.hint}>
          第 {safePageIndex + 1} / {totalPages} 页 · 点两边大按钮翻页
        </Text>

        {selectedAnimal ? (
          <AnimalModal animal={selectedAnimal} onClose={handleModalClose} />
        ) : null}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
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
  pager: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageNav: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  pageNavDisabled: {
    opacity: 0.35,
  },
  pageNavPressed: {
    opacity: 0.7,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    minWidth: 0,
    alignContent: 'flex-start',
  },
  gridItem: {
    padding: 0,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,107,107,0.25)',
  },
  dotActive: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.2 }],
  },
  hint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
});
