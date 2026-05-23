import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FamilyAddCard, FamilyCard } from '@/components/FamilyCard';
import { FamilyImageModal } from '@/components/FamilyImageModal';
import { FamilyRelationEditor } from '@/components/FamilyRelationEditor';
import { ScreenBackground } from '@/components/ScreenBackground';
import type { FamilyRelation } from '@/src/data/familyRelations';
import { audioService } from '@/src/services/audioService';
import { deleteFamilyImagesForId, deleteFamilyListImage, getFamilyImageMap } from '@/src/services/familyImageStore';
import { deleteFamilyRecording } from '@/src/services/familyRecordingStore';
import {
  createNewRelationDraft,
  deleteFamilyRelations,
  getFamilyRelations,
  saveFamilyRelation,
} from '@/src/services/familyRelationStore';
import { colors } from '@/src/theme/colors';
import { getFamilyGridLayout } from '@/src/utils/pagination';

type ImageMaps = {
  list: Record<string, string>;
  detail: Record<string, string>;
};

function splitImageMap(map: Record<string, string>): ImageMaps {
  const list: Record<string, string> = {};
  const detail: Record<string, string> = {};
  for (const [key, uri] of Object.entries(map)) {
    if (key.endsWith('__detail')) {
      detail[key.replace('__detail', '')] = uri;
    } else {
      list[key] = uri;
    }
  }
  return { list, detail };
}

export default function FamilyScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const [gridHeight, setGridHeight] = useState(0);

  const [relations, setRelations] = useState<FamilyRelation[]>([]);
  const [listImageMap, setListImageMap] = useState<Record<string, string>>({});
  const [detailImageMap, setDetailImageMap] = useState<Record<string, string>>({});

  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalRelation, setModalRelation] = useState<FamilyRelation | null>(null);
  const [editorRelation, setEditorRelation] = useState<FamilyRelation | null>(null);
  const [editorListUri, setEditorListUri] = useState<string | null>(null);
  const [editorDetailUri, setEditorDetailUri] = useState<string | null>(null);

  const playTokenRef = useRef(0);

  const displayCount = editMode ? relations.length + 1 : Math.max(relations.length, relations.length === 0 ? 1 : 0);

  const gridLayout = useMemo(
    () => getFamilyGridLayout(width, height, displayCount, gridWidth, gridHeight),
    [width, height, displayCount, gridWidth, gridHeight]
  );
  const { numColumns, cardSize, gap, rowGap, imageSize } = gridLayout;

  const refreshAll = useCallback(async () => {
    const [nextRelations, imageMap] = await Promise.all([getFamilyRelations(), getFamilyImageMap()]);
    const images = splitImageMap(imageMap);
    setRelations(nextRelations);
    setListImageMap(images.list);
    setDetailImageMap(images.detail);
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useFocusEffect(
    useCallback(() => {
      void refreshAll();
    }, [refreshAll])
  );

  const closeModal = useCallback(() => {
    playTokenRef.current++;
    void audioService.stop();
    setModalRelation(null);
    setActiveId(null);
  }, []);

  const resetEditor = useCallback(() => {
    playTokenRef.current++;
    void audioService.stop();
    setEditorRelation(null);
    setEditorListUri(null);
    setEditorDetailUri(null);
  }, []);

  const closeEditor = useCallback(() => {
    const draft = editorRelation;
    resetEditor();
    if (!draft) return;
    const isExisting = relations.some((item) => item.id === draft.id);
    if (!isExisting) {
      void deleteFamilyImagesForId(draft.id);
      void deleteFamilyRecording(draft.id);
    }
  }, [editorRelation, relations, resetEditor]);

  const playRelationSpeech = useCallback(async (relation: FamilyRelation) => {
    const token = ++playTokenRef.current;
    setActiveId(relation.id);
    try {
      await audioService.speakFamilyRelation(relation);
    } finally {
      if (playTokenRef.current === token) {
        setActiveId(null);
      }
    }
  }, []);

  const openAddEditor = useCallback(async () => {
    playTokenRef.current++;
    void audioService.stop();
    const draft = await createNewRelationDraft();
    setEditorRelation(draft);
    setEditorListUri(null);
    setEditorDetailUri(null);
  }, []);

  const openEditEditor = useCallback((relation: FamilyRelation) => {
    playTokenRef.current++;
    void audioService.stop();
    setEditorRelation(relation);
    setEditorListUri(listImageMap[relation.id] ?? null);
    setEditorDetailUri(detailImageMap[relation.id] ?? null);
  }, [detailImageMap, listImageMap]);

  const toggleRelationSelection = useCallback((relationId: string) => {
    setSelectedIds((prev) =>
      prev.includes(relationId)
        ? prev.filter((id) => id !== relationId)
        : [...prev, relationId]
    );
  }, []);

  const handleCardPress = useCallback(
    async (relation: FamilyRelation) => {
      if (editMode) {
        openEditEditor(relation);
        return;
      }

      setModalRelation(relation);
      await playRelationSpeech(relation);
    },
    [editMode, openEditEditor, playRelationSpeech]
  );

  const handleEditorSave = useCallback(
    async (
      relation: FamilyRelation,
      images: { listImageUri?: string | null; detailImageUri?: string | null }
    ) => {
      if (relation.imageSource === 'emoji') {
        await deleteFamilyListImage(relation.id);
      }
      await saveFamilyRelation(relation);
      setListImageMap((prev) => {
        const next = { ...prev };
        if (relation.imageSource === 'emoji') {
          delete next[relation.id];
        } else if (images.listImageUri) {
          next[relation.id] = images.listImageUri;
        }
        return next;
      });
      if (images.detailImageUri) {
        setDetailImageMap((prev) => ({ ...prev, [relation.id]: images.detailImageUri! }));
      }
      await refreshAll();
      resetEditor();
    },
    [refreshAll, resetEditor]
  );

  const replayModal = useCallback(async () => {
    if (!modalRelation) return;
    await playRelationSpeech(modalRelation);
  }, [modalRelation, playRelationSpeech]);

  useEffect(() => {
    return () => {
      playTokenRef.current++;
      void audioService.stop();
    };
  }, []);

  const goHome = () => {
    playTokenRef.current++;
    void audioService.stop();
    setModalRelation(null);
    closeEditor();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const toggleEditMode = () => {
    playTokenRef.current++;
    void audioService.stop();
    setModalRelation(null);
    setActiveId(null);
    setSelectedIds([]);
    setEditMode((value) => !value);
  };

  const confirmBatchDelete = () => {
    if (selectedIds.length === 0) {
      Alert.alert('请先选择', '点选要删除的关系卡片。');
      return;
    }
    Alert.alert('删除关系', `确定删除选中的 ${selectedIds.length} 项吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteFamilyRelations(selectedIds);
            setSelectedIds([]);
            await refreshAll();
          })();
        },
      },
    ]);
  };

  const onGridLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w !== gridWidth) setGridWidth(w);
    if (h !== gridHeight) setGridHeight(h);
  };

  const cellWidth =
    gridWidth > 0 ? (gridWidth - gap * (numColumns - 1)) / numColumns : undefined;

  const modalImageUri = modalRelation
    ? detailImageMap[modalRelation.id] ?? listImageMap[modalRelation.id]
    : null;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            onPress={goHome}
            accessibilityLabel="返回首页"
            hitSlop={8}
          >
            <FontAwesome name="chevron-left" size={22} color="#666" />
          </Pressable>
          <Text style={styles.pageTitle}>宝宝关系谱</Text>
          <View style={styles.headerActions}>
            {editMode && selectedIds.length > 0 && (
              <Pressable
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                onPress={confirmBatchDelete}
                accessibilityLabel={`删除选中的 ${selectedIds.length} 项`}
                hitSlop={8}
              >
                <FontAwesome name="trash-o" size={18} color="#fff" />
                <Text style={styles.deleteButtonText}>{selectedIds.length}</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                editMode && styles.editButtonActive,
                pressed && styles.pressed,
              ]}
              onPress={toggleEditMode}
              accessibilityLabel={editMode ? '退出编辑' : '编辑关系谱'}
              hitSlop={8}
            >
              <FontAwesome
                name={editMode ? 'check' : 'pencil'}
                size={20}
                color={editMode ? '#fff' : colors.primary}
              />
            </Pressable>
          </View>
        </View>

        {editMode && (
          <Text style={styles.editHint}>
            {selectedIds.length > 0
              ? `已选 ${selectedIds.length} 项 · 点右上角 🗑 删除，或点卡片继续编辑`
              : '点卡片编辑详情 · 点卡片右上角勾选后可批量删除'}
          </Text>
        )}

        <View style={styles.gridWrap} onLayout={onGridLayout}>
          {relations.length === 0 && !editMode ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>还没有关系</Text>
              <Text style={styles.emptyHint}>手动添加家人、亲友，让宝宝认识他们</Text>
              <View style={styles.emptyCardWrap}>
                <FamilyAddCard
                  onPress={() => void openAddEditor()}
                  size={cardSize}
                  imageSize={imageSize ?? 120}
                  label="添加第一个关系"
                />
              </View>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.gridScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={[styles.grid, { gap, rowGap }]}>
                {editMode && (
                  <View
                    style={[
                      styles.gridItem,
                      cellWidth != null ? { width: cellWidth } : { width: `${100 / numColumns}%` },
                    ]}
                  >
                    <FamilyAddCard
                      onPress={() => void openAddEditor()}
                      size={cardSize}
                      imageSize={imageSize}
                    />
                  </View>
                )}
                {relations.map((relation) => (
                  <View
                    key={relation.id}
                    style={[
                      styles.gridItem,
                      cellWidth != null ? { width: cellWidth } : { width: `${100 / numColumns}%` },
                    ]}
                  >
                    <FamilyCard
                      relation={relation}
                      imageUri={listImageMap[relation.id]}
                      editMode={editMode}
                      selected={selectedIds.includes(relation.id)}
                      isActive={activeId === relation.id}
                      size={cardSize}
                      imageSize={imageSize}
                      onPress={() => void handleCardPress(relation)}
                      onSelectPress={() => toggleRelationSelection(relation.id)}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <Text style={styles.hint}>
          {editMode
            ? selectedIds.length > 0
              ? '删除按钮在右上角铅笔旁边'
              : '编辑完成后点右上角 ✓ 退出'
            : relations.length > 0
              ? '点卡片看大图 · 大图点击重播'
              : '添加关系后可点卡片听语音'}
        </Text>

        <FamilyImageModal
          visible={modalRelation != null}
          relation={modalRelation}
          imageUri={modalImageUri}
          onClose={closeModal}
          onReplay={() => void replayModal()}
        />

        <FamilyRelationEditor
          visible={editorRelation != null}
          relation={editorRelation}
          listImageUri={editorListUri}
          detailImageUri={editorDetailUri}
          onClose={closeEditor}
          onSave={(relation, images) => void handleEditorSave(relation, images)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
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
  deleteButton: {
    minWidth: 48,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 14,
    backgroundColor: '#E45757',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  pressed: {
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
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyCardWrap: {
    width: '100%',
    maxWidth: 220,
    alignItems: 'center',
  },
  gridScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  gridItem: {
    alignItems: 'center',
  },
  hint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 10,
  },
});
