import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { FamilyCard } from '@/components/FamilyCard';
import { FamilyImageModal } from '@/components/FamilyImageModal';
import { ScreenBackground } from '@/components/ScreenBackground';
import { FAMILY_TITLES, type FamilyTitle } from '@/src/data/familyTitles';
import { audioService } from '@/src/services/audioService';
import { getFamilyImageMap, saveFamilyImage } from '@/src/services/familyImageStore';
import { colors } from '@/src/theme/colors';
import { chunk, getAnimalGridLayout, getPageNavMetrics } from '@/src/utils/pagination';

export default function FamilyScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const gridLayout = useMemo(() => getAnimalGridLayout(width, height), [width, height]);
  const { numColumns, numRows, itemsPerPage, cardSize } = gridLayout;
  const pageNav = useMemo(() => getPageNavMetrics(cardSize), [cardSize]);

  const [pageIndex, setPageIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<FamilyTitle | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  const playTokenRef = useRef(0);
  const trackTranslate = useRef(new Animated.Value(0)).current;

  const refreshImages = useCallback(async () => {
    const map = await getFamilyImageMap();
    setImageMap(map);
  }, []);

  useEffect(() => {
    void refreshImages();
  }, [refreshImages]);

  useFocusEffect(
    useCallback(() => {
      void refreshImages();
    }, [refreshImages])
  );

  const pages = useMemo(() => chunk(FAMILY_TITLES, itemsPerPage), [itemsPerPage]);
  const totalPages = pages.length;
  const safePageIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));

  useEffect(() => {
    Animated.timing(trackTranslate, {
      toValue: -safePageIndex * viewportWidth,
      duration: viewportWidth > 0 ? 320 : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [safePageIndex, viewportWidth, trackTranslate]);

  const closeModal = useCallback(() => {
    playTokenRef.current++;
    void audioService.stop();
    setModalTitle(null);
    setActiveId(null);
  }, []);

  const playFamilySpeech = useCallback(async (title: FamilyTitle) => {
    const token = ++playTokenRef.current;
    setActiveId(title.id);
    try {
      await audioService.speakFamilyCall(title);
    } finally {
      if (playTokenRef.current === token) {
        setActiveId(null);
      }
    }
  }, []);

  const pickAndSaveImage = useCallback(
    async (title: FamilyTitle) => {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('需要相册权限', '请在系统设置中允许访问相册，才能从本地选择照片。');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        });

        if (result.canceled || !result.assets[0]?.uri) return;

        const savedUri = await saveFamilyImage(title.id, result.assets[0].uri);
        setImageMap((prev) => ({ ...prev, [title.id]: savedUri }));
      } catch {
        Alert.alert('更换失败', '无法读取本地照片，请换一张试试。');
      }
    },
    []
  );

  const openTitle = useCallback(
    async (title: FamilyTitle) => {
      if (editMode) {
        await pickAndSaveImage(title);
        return;
      }

      setModalTitle(title);
      await playFamilySpeech(title);
    },
    [editMode, pickAndSaveImage, playFamilySpeech]
  );

  const replayModal = useCallback(async () => {
    if (!modalTitle) return;
    await playFamilySpeech(modalTitle);
  }, [modalTitle, playFamilySpeech]);

  useEffect(() => {
    return () => {
      playTokenRef.current++;
      void audioService.stop();
    };
  }, []);

  const goHome = () => {
    playTokenRef.current++;
    void audioService.stop();
    setModalTitle(null);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const toggleEditMode = () => {
    playTokenRef.current++;
    void audioService.stop();
    setModalTitle(null);
    setActiveId(null);
    setEditMode((v) => !v);
  };

  const onViewportLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== viewportWidth) setViewportWidth(w);
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
          <Text style={styles.pageTitle}>称呼叫声</Text>
          <Pressable
            style={({ pressed }) => [
              styles.editButton,
              editMode && styles.editButtonActive,
              pressed && styles.backPressed,
            ]}
            onPress={toggleEditMode}
            accessibilityLabel={editMode ? '退出编辑' : '编辑照片'}
            hitSlop={8}
          >
            <FontAwesome
              name={editMode ? 'check' : 'pencil'}
              size={20}
              color={editMode ? '#fff' : colors.primary}
            />
          </Pressable>
        </View>

        {editMode && (
          <Text style={styles.editHint}>编辑模式：点击称呼卡片，从相册选择本地照片</Text>
        )}

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
              onPress={() => setPageIndex((i) => Math.max(0, i - 1))}
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
                {pages.map((pageTitles, idx) => (
                  <View key={idx} style={[styles.page, { width: viewportWidth }]}>
                    <View style={styles.grid}>
                      {pageTitles.map((title) => (
                        <View
                          key={title.id}
                          style={[
                            styles.gridItem,
                            {
                              width: `${100 / numColumns}%`,
                              height: `${100 / numRows}%`,
                            },
                          ]}
                        >
                          <FamilyCard
                            title={title}
                            imageUri={imageMap[title.id]}
                            editMode={editMode}
                            isActive={activeId === title.id}
                            size={cardSize}
                            onPress={() => void openTitle(title)}
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
              onPress={() => setPageIndex((i) => Math.min(totalPages - 1, i + 1))}
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
          {editMode
            ? '编辑完成后点右上角 ✓ 退出'
            : `第 ${safePageIndex + 1} / ${totalPages} 页 · 点卡片看大图`}
        </Text>

        <FamilyImageModal
          visible={modalTitle != null}
          title={modalTitle}
          imageUri={modalTitle ? imageMap[modalTitle.id] : null}
          onClose={closeModal}
          onReplay={() => void replayModal()}
        />
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
    gap: 12,
    marginBottom: 12,
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
  editButton: {
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
  editButtonActive: {
    backgroundColor: colors.primary,
  },
  backPressed: {
    opacity: 0.85,
  },
  pageTitle: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
  },
  editHint: {
    marginBottom: 10,
    marginHorizontal: 4,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
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
