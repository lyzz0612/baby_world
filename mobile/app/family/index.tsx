import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AnimatedReanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
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
import { chunk, getFamilyGridLayout, getPageNavMetrics } from '@/src/utils/pagination';
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
  const [viewportWidth, setViewportWidth] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);

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
  const trackTranslate = useRef(new Animated.Value(0)).current;

  const gridLayout = useMemo(() => getFamilyGridLayout(width, height), [width, height]);
  const { numColumns, itemsPerPage, cardSize, gap, rowGap, imageSize } = gridLayout;
  const pageNav = useMemo(() => getPageNavMetrics(cardSize), [cardSize]);
  const pages = useMemo(() => chunk(relations, itemsPerPage), [relations, itemsPerPage]);
  const totalPages = pages.length;
  const safePageIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));
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

  useEffect(() => {
    const total = Math.max(1, Math.ceil(relations.length / itemsPerPage));
    setPageIndex((index) => Math.min(index, total - 1));
  }, [relations.length, itemsPerPage]);

  useEffect(() => {
    if (editMode) return;
    Animated.timing(trackTranslate, {
      toValue: -safePageIndex * viewportWidth,
      duration: viewportWidth > 0 ? 320 : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [editMode, safePageIndex, viewportWidth, trackTranslate]);

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

  const exitEditMode = useCallback(() => {
    playTokenRef.current++;
    void audioService.stop();
    setModalRelation(null);
    setActiveId(null);
    setSelectedIds([]);
    if (editorRelation) {
      closeEditor();
    }
    setEditMode(false);
    setDraggingId(null);
    void refreshAll();
  }, [closeEditor, editorRelation, refreshAll]);

  const handleHeaderBack = () => {
    if (editMode) {
      exitEditMode();
      return;
    }
    goHome();
  };

  const toggleEditMode = () => {
    if (editMode) {
      exitEditMode();
      return;
    }

    playTokenRef.current++;
    void audioService.stop();
    setModalRelation(null);
    setActiveId(null);
    setSelectedIds([]);
    setEditMode(true);
    setDraggingId(null);
  };

  useEffect(() => {
    if (!editMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitEditMode();
      return true;
    });
    return () => sub.remove();
  }, [editMode, exitEditMode]);

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
    const w = e.nativeEvent.layout.width;
    if (w !== gridWidth) setGridWidth(w);
  };

  const onViewportLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== viewportWidth) setViewportWidth(w);
  };

  const editCellWidth =
    gridWidth > 0 ? (gridWidth - gap * (numColumns - 1)) / numColumns : undefined;
  const browseCellWidth =
    viewportWidth > 0 ? (viewportWidth - gap * (numColumns - 1)) / numColumns : undefined;

  const goPrevPage = () => setPageIndex((index) => Math.max(0, index - 1));
  const goNextPage = () => setPageIndex((index) => Math.min(totalPages - 1, index + 1));

  const renderGridItem = (
    key: string,
    content: ReactNode,
    containerWidth: number | undefined,
    itemWidth: number | undefined
  ) => (
    <View
      key={key}
      style={[
        styles.gridItem,
        itemWidth != null
          ? { width: itemWidth }
          : containerWidth != null
            ? { width: (containerWidth - gap * (numColumns - 1)) / numColumns }
            : { width: `${100 / numColumns}%` },
      ]}
    >
      {content}
    </View>
  );

  const renderRelationCard = (relation: FamilyRelation, inEditMode: boolean) => {
    const card = (
      <FamilyCard
        relation={relation}
        imageUri={listImageMap[relation.id]}
        editMode={inEditMode}
        selected={selectedIds.includes(relation.id)}
        isActive={activeId === relation.id}
        size={cardSize}
        imageSize={imageSize}
        disabled={!!draggingId}
        onPress={() => void handleCardPress(relation)}
        onSelectPress={() => toggleRelationSelection(relation.id)}
      />
    );

    if (!inEditMode || !dragEnabled) return card;

    return (
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
    );
  };

  const modalImageUri = modalRelation
    ? detailImageMap[modalRelation.id] ?? listImageMap[modalRelation.id]
    : null;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              editMode ? styles.cancelButton : styles.iconButton,
              pressed && styles.pressed,
            ]}
            onPress={handleHeaderBack}
            accessibilityLabel={editMode ? '取消编辑' : '返回首页'}
            hitSlop={8}
          >
            {editMode ? (
              <Text style={styles.cancelButtonText}>取消</Text>
            ) : (
              <FontAwesome name="chevron-left" size={22} color="#666" />
            )}
          </Pressable>
          <Text style={styles.pageTitle}>{editMode ? '编辑关系谱' : '宝宝关系谱'}</Text>
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
              accessibilityLabel={editMode ? '完成编辑' : '编辑关系谱'}
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
              : '长按拖动排序 · 点卡片编辑 · 左上角取消或右上角 ✓ 完成'}
          </Text>
        )}

        {editMode ? (
          <View style={styles.gridWrap} onLayout={onGridLayout}>
            <ScrollView
              contentContainerStyle={styles.gridScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
              scrollEnabled={!draggingId}
            >
              <View style={[styles.grid, { gap, rowGap }]}>
                {renderGridItem(
                  'add-relation',
                  <FamilyAddCard
                    onPress={() => void openAddEditor()}
                    size={cardSize}
                    imageSize={imageSize}
                    label="添加关系"
                  />,
                  gridWidth,
                  editCellWidth
                )}
                {relations.map((relation) =>
                  renderGridItem(
                    relation.id,
                    renderRelationCard(relation, true),
                    gridWidth,
                    editCellWidth
                  )
                )}
              </View>
            </ScrollView>
          </View>
        ) : (
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
                onPress={goPrevPage}
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
                  {pages.map((pageRelations, pageIdx) => (
                    <View key={pageIdx} style={[styles.browsePage, { width: viewportWidth }]}>
                      {relations.length === 0 && pageIdx === 0 && (
                        <View style={styles.emptyHintWrap}>
                          <Text style={styles.emptyTitle}>还没有关系</Text>
                          <Text style={styles.emptyHint}>手动添加家人、亲友，让宝宝认识他们</Text>
                        </View>
                      )}
                      <View style={[styles.grid, { gap, rowGap }]}>
                        {pageRelations.map((relation) =>
                          renderGridItem(
                            relation.id,
                            renderRelationCard(relation, false),
                            viewportWidth,
                            browseCellWidth
                          )
                        )}
                        {relations.length === 0 && pageIdx === 0 &&
                          renderGridItem(
                            'add-first',
                            <FamilyAddCard
                              onPress={() => void openAddEditor()}
                              size={cardSize}
                              imageSize={imageSize}
                              label="添加第一个关系"
                            />,
                            viewportWidth,
                            browseCellWidth
                          )}
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
                onPress={goNextPage}
                disabled={safePageIndex >= totalPages - 1}
                accessibilityLabel="下一页"
              >
                <FontAwesome name="chevron-right" size={pageNav.iconSize} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        )}

        {!editMode && relations.length > 0 && (
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
        )}

        <Text style={styles.hint}>
          {editMode
            ? selectedIds.length > 0
              ? '删除按钮在右上角 ✓ 旁边'
              : '点左上角取消或右上角 ✓ 完成编辑'
            : relations.length > 0
              ? `第 ${safePageIndex + 1} / ${totalPages} 页 · 点两边大按钮翻页 · 点卡片看大图`
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
        <AnimatedReanimated.View pointerEvents="none" style={styles.dragOverlay}>
          <AnimatedReanimated.View style={[styles.dragFloating, floatingDragStyle]}>
            <FamilyCard
              relation={draggingRelation}
              imageUri={listImageMap[draggingRelation.id]}
              editMode={editMode}
              size={cardSize}
              imageSize={imageSize}
              onPress={() => undefined}
            />
          </AnimatedReanimated.View>
        </AnimatedReanimated.View>
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
  cancelButton: {
    minWidth: 68,
    height: 48,
    paddingHorizontal: 14,
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
  cancelButtonText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 16,
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
  pager: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 0,
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
  browsePage: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
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
