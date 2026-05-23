import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { getFamilyGridLayout } from '@/src/utils/pagination';

export default function FamilyScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const gridLayout = useMemo(
    () => getFamilyGridLayout(width, height, FAMILY_TITLES.length),
    [width, height]
  );
  const { numColumns, numRows, cardSize, gap } = gridLayout;

  const [editMode, setEditMode] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<FamilyTitle | null>(null);
  const [gridHeight, setGridHeight] = useState(0);

  const playTokenRef = useRef(0);

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

  const pickAndSaveImage = useCallback(async (title: FamilyTitle) => {
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
  }, []);

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

  const onGridLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h !== gridHeight) setGridHeight(h);
  };

  const cellHeight =
    gridHeight > 0 ? (gridHeight - gap * (numRows - 1)) / numRows : undefined;

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

        <View style={styles.gridWrap} onLayout={onGridLayout}>
          <View style={[styles.grid, { margin: -(gap / 2) }]}>
            {FAMILY_TITLES.map((title) => (
              <View
                key={title.id}
                style={[
                  styles.gridItem,
                  {
                    width: `${100 / numColumns}%`,
                    height: cellHeight ?? `${100 / numRows}%`,
                    padding: gap / 2,
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

        <Text style={styles.hint}>
          {editMode ? '编辑完成后点右上角 ✓ 退出' : '点卡片看大图 · 大图点击重播'}
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
    paddingHorizontal: 16,
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
  gridWrap: {
    flex: 1,
    minHeight: 0,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  gridItem: {
    minHeight: 0,
  },
  hint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 10,
  },
});
