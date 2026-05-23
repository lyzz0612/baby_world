import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimalCard } from '@/components/AnimalCard';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ANIMALS, type Animal } from '@/src/data/animals';
import { audioService } from '@/src/services/audioService';
import { recordAnimalClick, sortAnimalsByClicks } from '@/src/services/clickStats';
import { colors } from '@/src/theme/colors';
import { chunk, getAnimalGridLayout, getPageNavMetrics } from '@/src/utils/pagination';

export default function AnimalsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const gridLayout = useMemo(() => getAnimalGridLayout(width, height), [width, height]);
  const { numColumns, numRows, itemsPerPage, cardSize } = gridLayout;
  const pageNav = useMemo(() => getPageNavMetrics(cardSize), [cardSize]);

  const [sortedAnimals, setSortedAnimals] = useState<Animal[]>(ANIMALS);
  const [pageIndex, setPageIndex] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  const playTokenRef = useRef(0);
  const trackTranslate = useRef(new Animated.Value(0)).current;

  const refreshSort = useCallback(async () => {
    const sorted = await sortAnimalsByClicks(ANIMALS);
    setSortedAnimals(sorted);
    const total = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
    setPageIndex((i) => Math.min(i, total - 1));
  }, [itemsPerPage]);

  useEffect(() => {
    refreshSort().finally(() => setReady(true));
  }, [refreshSort]);

  // 重新进入页面时按最新点击数据排序；播放过程中不动布局，避免视觉跳动
  useFocusEffect(
    useCallback(() => {
      void refreshSort();
    }, [refreshSort])
  );

  const pages = useMemo(
    () => chunk(sortedAnimals, itemsPerPage),
    [sortedAnimals, itemsPerPage]
  );
  const totalPages = pages.length;
  const safePageIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));

  // 翻页：track translateX 动画，等价 web 端 transform: translateX(-N*100%)
  useEffect(() => {
    Animated.timing(trackTranslate, {
      toValue: -safePageIndex * viewportWidth,
      duration: viewportWidth > 0 ? 320 : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [safePageIndex, viewportWidth, trackTranslate]);

  const goPrev = () => setPageIndex((i) => Math.max(0, i - 1));
  const goNext = () => setPageIndex((i) => Math.min(totalPages - 1, i + 1));

  const handleAnimalPress = useCallback(
    async (animal: Animal) => {
      const token = ++playTokenRef.current;
      recordAnimalClick(animal.id);
      await audioService.stop();
      if (playTokenRef.current !== token) return;
      setPlayingId(animal.id);
      try {
        await audioService.playAnimalSound(animal);
      } finally {
        if (playTokenRef.current === token) {
          setPlayingId(null);
        }
      }
    },
    []
  );

  // 离开页面时停掉播放
  useEffect(() => {
    return () => {
      playTokenRef.current++;
      void audioService.stop();
    };
  }, []);

  const goHome = () => {
    playTokenRef.current++;
    void audioService.stop();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const onViewportLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== viewportWidth) setViewportWidth(w);
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
          <View style={[styles.pageNavRail, { width: pageNav.railWidth }]}>
            <Pressable
              style={({ pressed }) => [
                styles.pageNav,
                {
                  width: pageNav.buttonSize,
                  height: pageNav.buttonSize,
                  borderRadius: pageNav.buttonSize / 2,
                },
                safePageIndex === 0 && styles.pageNavDisabled,
                pressed && safePageIndex !== 0 && styles.pageNavPressed,
              ]}
              onPress={goPrev}
              disabled={safePageIndex === 0}
              accessibilityLabel="上一页"
            >
              <FontAwesome name="chevron-left" size={pageNav.iconSize} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.viewport} onLayout={onViewportLayout}>
            {viewportWidth > 0 ? (
              <Animated.View
                style={[
                  styles.track,
                  {
                    width: viewportWidth * pages.length,
                    transform: [{ translateX: trackTranslate }],
                  },
                ]}
              >
                {pages.map((pageAnimals, idx) => (
                  <View
                    key={idx}
                    style={[styles.page, { width: viewportWidth }]}
                  >
                    <View style={styles.grid}>
                      {pageAnimals.map((animal) => (
                        <View
                          key={animal.id}
                          style={[
                            styles.gridItem,
                            {
                              width: `${100 / numColumns}%`,
                              height: `${100 / numRows}%`,
                            },
                          ]}
                        >
                          <AnimalCard
                            animal={animal}
                            isPlaying={playingId === animal.id}
                            size={cardSize}
                            onPress={() => void handleAnimalPress(animal)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </Animated.View>
            ) : null}
          </View>

          <View style={[styles.pageNavRail, styles.pageNavRailRight, { width: pageNav.railWidth }]}>
            <Pressable
              style={({ pressed }) => [
                styles.pageNav,
                {
                  width: pageNav.buttonSize,
                  height: pageNav.buttonSize,
                  borderRadius: pageNav.buttonSize / 2,
                },
                safePageIndex >= totalPages - 1 && styles.pageNavDisabled,
                pressed && safePageIndex < totalPages - 1 && styles.pageNavPressed,
              ]}
              onPress={goNext}
              disabled={safePageIndex >= totalPages - 1}
              accessibilityLabel="下一页"
            >
              <FontAwesome name="chevron-right" size={pageNav.iconSize} color={colors.primary} />
            </Pressable>
          </View>
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
    alignItems: 'stretch',
  },
  pageNavRail: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  pageNavRailRight: {
    alignItems: 'flex-end',
  },
  pageNav: {
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
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  track: {
    flex: 1,
    flexDirection: 'row',
  },
  page: {
    flex: 1,
    height: '100%',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    minWidth: 0,
    minHeight: 0,
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
