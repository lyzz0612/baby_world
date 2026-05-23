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
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FamilyAddCard, FamilyCard } from '@/components/FamilyCard';
import { FamilyDraggableGridItem } from '@/components/FamilyDraggableGridItem';
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
  reorderFamilyRelations,
  saveFamilyRelation,
} from '@/src/services/familyRelationStore';
import { colors } from '@/src/theme/colors';
import { FAMILY_LAYOUT_REFERENCE_COUNT, getFamilyGridLayout } from '@/src/utils/pagination';
import { findDropIndex, type LayoutRect } from '@/src/utils/familyGridReorder';

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
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const playTokenRef = useRef(0);
  const itemLayoutsRef = useRef(new Map<string, LayoutRect>());
  const dragOriginX = useSharedValue(0);
  const dragOriginY = useSharedValue(0);
  const dragOriginW = useSharedValue(0);
  const dragTranslateX = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);

  const visibleItemCount = relations.length + (editMode ? 1 : 0);
  const gridItemCount = Math.max(visibleItemCount || 1, FAMILY_LAYOUT_REFERENCE_COUNT);

  const gridLayout = useMemo(
    () => getFamilyGridLayout(width, height, gridItemCount, gridWidth),
    [width, height, gridItemCount, gridWidth]
  );
  const { numColumns, cardSize, gap, rowGap, imageSize } = gridLayout;
  const dragEnabled = editMode && selectedIds.length === 0 && relations.length > 1;
  const draggingRelation = useMemo(
    () => relations.find((item) => item.id === draggingId) ?? null,
    [draggingId, relations]
  );

  const floatingDragStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: dragOriginX.value + dragTranslateX.value,
    top: dragOriginY.value + dragTranslateY.value,
    width: dragOriginW.value,
    zIndex: 1000,
    elevation: 16,
  }));

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

  const handleMeasureItem = useCallback((id: string, rect: LayoutRect) => {
    itemLayoutsRef.current.set(id, rect);
  }, []);

  const handleDragStart = useCallback(
    (id: string, rect: LayoutRect) => {
      dragOriginX.value = rect.x;
      dragOriginY.value = rect.y;
      dragOriginW.value = rect.width;
      dragTranslateX.value = 0;
      dragTranslateY.value = 0;
      setDraggingId(id);
    },
    [dragOriginW, dragOriginX, dragOriginY, dragTranslateX, dragTranslateY]
  );

  const handleDragMove = useCallback(
    (translationX: number, translationY: number) => {
      dragTranslateX.value = translationX;
      dragTranslateY.value = translationY;
    },
    [dragTranslateX, dragTranslateY]
  );

  const moveRelationToIndex = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setRelations((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      void reorderFamilyRelations(next.map((entry) => entry.id));
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(
    (absoluteX: number, absoluteY: number) => {
      const currentId = draggingId;
      dragTranslateX.value = 0;
      dragTranslateY.value = 0;
      setDraggingId(null);

      if (!currentId) return;
      const fromIndex = relations.findIndex((item) => item.id === currentId);
      if (fromIndex < 0) return;

      const dropIndex = findDropIndex(
        absoluteX,
        absoluteY,
        relations.map((item) => item.id),
        itemLayoutsRef.current,
        currentId
      );
      if (dropIndex == null) return;
      moveRelationToIndex(fromIndex, dropIndex);
    },
    [draggingId, dragTranslateX, moveRelationToIndex, relations]
  );

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
      images: { listImageUri?: string | null; detailImageUri?: string | null; removedListImage?: boolean }
    ) => {
      const existingListUri = listImageMap[relation.id] ?? null;
      const nextListUri = images.removedListImage
        ? null
        : images.listImageUri ?? existingListUri;
      const relationToSave: FamilyRelation = {
        ...relation,
        imageSource: nextListUri ? 'photo' : 'emoji',
      };

      if (relationToSave.imageSource === 'emoji') {
        await deleteFamilyListImage(relation.id);
      }

      await saveFamilyRelation(relationToSave);

      setListImageMap((prev) => {
        const next = { ...prev };
        if (nextListUri) {
          next[relation.id] = nextListUri;
        } else {
          delete next[relation.id];
        }
        return next;
      });

      if (images.detailImageUri) {
        setDetailImageMap((prev) => ({ ...prev, [relation.id]: images.detailImageUri! }));
      } else if (images.removedListImage) {
        setDetailImageMap((prev) => {
          const next = { ...prev };
          delete next[relation.id];
          return next;
        });
      }

      await refreshAll();
      resetEditor();
    },
    [listImageMap, refreshAll, resetEditor]
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
    if (editorRelation) {
      closeEditor();
    }
    const leavingEdit = editMode;
    setEditMode((value) => !value);
    setDraggingId(null);
    if (leavingEdit) {
      void refreshAll();
    }
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
              : '长按拖动排序 · 点卡片编辑 · 右上角勾选可删除'}
          </Text>
        )}

        <View style={styles.gridWrap} onLayout={onGridLayout}>
          <ScrollView
            contentContainerStyle={styles.gridScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
            scrollEnabled={!draggingId}
          >
            {relations.length === 0 && !editMode && (
              <View style={styles.emptyHintWrap}>
                <Text style={styles.emptyTitle}>还没有关系</Text>
                <Text style={styles.emptyHint}>手动添加家人、亲友，让宝宝认识他们</Text>
              </View>
            )}
            <View style={[styles.grid, { gap, rowGap }]}>
              {(editMode || relations.length === 0) && (
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
                    label={relations.length === 0 ? '添加第一个关系' : '添加关系'}
                  />
                </View>
              )}
              {relations.map((relation) => {
                const card = (
                  <FamilyCard
                    relation={relation}
                    imageUri={listImageMap[relation.id]}
                    editMode={editMode}
                    selected={selectedIds.includes(relation.id)}
                    isActive={activeId === relation.id}
                    size={cardSize}
                    imageSize={imageSize}
                    disabled={!!draggingId}
                    onPress={() => void handleCardPress(relation)}
                    onSelectPress={() => toggleRelationSelection(relation.id)}
                  />
                );

                return (
                  <View
                    key={relation.id}
                    style={[
                      styles.gridItem,
                      cellWidth != null ? { width: cellWidth } : { width: `${100 / numColumns}%` },
                    ]}
                  >
                    {dragEnabled ? (
                      <FamilyDraggableGridItem
                        itemId={relation.id}
                        dragEnabled={dragEnabled}
                        isDragging={draggingId === relation.id}
                        onMeasure={handleMeasureItem}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                      >
                        {card}
                      </FamilyDraggableGridItem>
                    ) : (
                      card
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
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

      {draggingId && draggingRelation && (
        <Animated.View pointerEvents="none" style={styles.dragOverlay}>
          <Animated.View style={[styles.dragFloating, floatingDragStyle]}>
            <FamilyCard
              relation={draggingRelation}
              imageUri={listImageMap[draggingRelation.id]}
              editMode={editMode}
              size={cardSize}
              imageSize={imageSize}
              onPress={() => undefined}
            />
          </Animated.View>
        </Animated.View>
      )}
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
    overflow: 'visible',
  },
  emptyHintWrap: {
    alignItems: 'center',
    marginBottom: 20,
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
  },
  gridScroll: {
    flexGrow: 1,
    justifyContent: 'flex-start',
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
  dragFloating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 16,
  },
});
