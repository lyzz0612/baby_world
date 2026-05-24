import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  PRESET_FAMILY_EMOJIS,
  createDefaultTtsText,
  normalizeRelation,
  ttsTextForName,
  type FamilyRelation,
  type FamilyVoiceMode,
} from '@/src/data/familyRelations';
import { audioService } from '@/src/services/audioService';
import { saveFamilyImage } from '@/src/services/familyImageStore';
import {
  deleteFamilyRecording,
  getFamilyRecordingUri,
  saveFamilyRecording,
} from '@/src/services/familyRecordingStore';
import {
  getDefaultVoiceProfiles,
} from '@/src/services/familyVoice';
import { colors } from '@/src/theme/colors';

type Props = {
  visible: boolean;
  relation: FamilyRelation | null;
  listImageUri?: string | null;
  detailImageUri?: string | null;
  onClose: () => void;
  onSave: (
    relation: FamilyRelation,
    images: {
      listImageUri?: string | null;
      detailImageUri?: string | null;
      removedListImage?: boolean;
    }
  ) => void;
};

export function FamilyRelationEditor({
  visible,
  relation,
  listImageUri,
  detailImageUri,
  onClose,
  onSave,
}: Props) {
  const { width } = useWindowDimensions();
  const previewTokenRef = useRef(0);

  const [draft, setDraft] = useState<FamilyRelation | null>(null);
  const [listUri, setListUri] = useState<string | null>(null);
  const [detailUri, setDetailUri] = useState<string | null>(null);
  const [removedListImage, setRemovedListImage] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecordingBusy, setIsRecordingBusy] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const voicePresets = useMemo(() => getDefaultVoiceProfiles(), []);

  useEffect(() => {
    if (!visible || !relation) return;
    const initialTts = relation.ttsText.trim()
      ? relation.ttsText
      : createDefaultTtsText(relation.name);
    setDraft({ ...relation, ttsText: initialTts });
    setListUri(listImageUri ?? null);
    setDetailUri(detailImageUri ?? null);
    setRemovedListImage(false);
    void getFamilyRecordingUri(relation.id).then(setRecordingUri);
  }, [visible, relation, listImageUri, detailImageUri]);

  useEffect(() => {
    if (!visible) {
      previewTokenRef.current++;
      void audioService.stop();
    }
  }, [visible]);

  const updateDraft = useCallback((patch: Partial<FamilyRelation>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const pickImage = useCallback(
    async (variant: 'list' | 'detail') => {
      if (!draft) return;
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('需要相册权限', '请在系统设置中允许访问相册，才能从本地选择照片。');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: variant === 'list' ? [1, 1] : [4, 3],
          quality: 0.9,
        });

        if (result.canceled || !result.assets[0]?.uri) return;

        const savedUri = await saveFamilyImage(draft.id, result.assets[0].uri, variant);
        if (variant === 'list') {
          setListUri(savedUri);
          setRemovedListImage(false);
          updateDraft({ imageSource: 'photo' });
        } else {
          setDetailUri(savedUri);
        }
      } catch {
        Alert.alert('选择失败', '无法读取本地照片，请换一张试试。');
      }
    },
    [draft, updateDraft]
  );

  const selectEmoji = useCallback(
    (emoji: string) => {
      updateDraft({ emoji, imageSource: 'emoji' });
      setListUri(null);
      setRemovedListImage(true);
    },
    [updateDraft]
  );

  const startRecording = useCallback(async () => {
    if (!draft || isRecordingBusy) return;
    setIsRecordingBusy(true);
    try {
      previewTokenRef.current++;
      await audioService.stop();
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要麦克风权限', '请在系统设置中允许录音，才能录制语音。');
        return;
      }
      await audioService.prepareRecordingMode();
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert('录音失败', '暂时无法开始录音，请稍后再试。');
    } finally {
      setIsRecordingBusy(false);
    }
  }, [draft, isRecordingBusy, recorder]);

  const stopRecording = useCallback(async () => {
    if (!draft || isRecordingBusy) return;
    setIsRecordingBusy(true);
    try {
      await recorder.stop();
      const tempUri = recorder.uri;
      if (!tempUri) {
        Alert.alert('录音失败', '没有录到有效音频，请重试。');
        return;
      }
      const savedUri = await saveFamilyRecording(draft.id, tempUri);
      setRecordingUri(savedUri);
      updateDraft({ voiceMode: 'recording' });
      await audioService.preparePlaybackMode();
    } catch {
      Alert.alert('保存失败', '录音保存失败，请重试。');
    } finally {
      setIsRecordingBusy(false);
    }
  }, [draft, isRecordingBusy, recorder, updateDraft]);

  const removeRecording = useCallback(async () => {
    if (!draft) return;
    previewTokenRef.current++;
    await audioService.stop();
    await deleteFamilyRecording(draft.id);
    setRecordingUri(null);
  }, [draft]);

  const previewVoice = useCallback(async () => {
    if (!draft) return;
    const token = ++previewTokenRef.current;
    const previewRelation = normalizeRelation({
      ...draft,
      voiceMode: draft.voiceMode,
      ttsText: draft.ttsText || createDefaultTtsText(draft.name),
    });

    if (previewRelation.voiceMode === 'recording') {
      if (!recordingUri) {
        Alert.alert('还没有录音', '请先录制一段语音，或切换到文本生成。');
        return;
      }
      await audioService.playRecordingUri(recordingUri);
      return;
    }

    await audioService.speakFamilyRelation(previewRelation);
    if (previewTokenRef.current !== token) {
      await audioService.stop();
    }
  }, [draft, recordingUri]);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    const normalized = normalizeRelation(draft);
    if (!normalized.name.trim()) {
      Alert.alert('请填写称呼', '给宝宝认识的关系需要一个称呼，比如爸爸、奶奶。');
      return;
    }
    if (normalized.voiceMode === 'recording' && !recordingUri) {
      Alert.alert('还没有录音', '请选择文本生成，或录制一段语音。');
      return;
    }

    setIsSaving(true);
    try {
      onSave(normalized, { listImageUri: listUri, detailImageUri: detailUri, removedListImage });
    } finally {
      setIsSaving(false);
    }
  }, [draft, detailUri, listUri, onSave, recordingUri, removedListImage]);

  if (!draft) return null;

  const editorWidth = Math.min(width - 32, 520);
  const cardInnerWidth = editorWidth - 32 - 28;
  const imageGridWidth = Math.round(cardInnerWidth * 0.92);
  const imageGridGap = 12;
  const listPreviewSize = Math.round(((imageGridWidth - imageGridGap) * 3) / 7);
  const previewHeight = listPreviewSize;
  const detailPreviewWidth = Math.round(listPreviewSize * (4 / 3));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { width: editorWidth }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{relation?.name ? '编辑关系' : '添加关系'}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="关闭">
              <FontAwesome name="times" size={22} color="#666" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>形象</Text>
              <View style={styles.sectionCard}>
                <View style={[styles.imageGrid, { width: imageGridWidth }]}>
                  <Pressable
                    style={[styles.listPreview, { width: listPreviewSize, height: listPreviewSize }]}
                    onPress={() => void pickImage('list')}
                    accessibilityLabel="选择列表方图"
                  >
                    {draft.imageSource === 'photo' && listUri ? (
                      <Image key={listUri} source={{ uri: listUri }} style={styles.imageFill} />
                    ) : (
                      <Text style={[styles.emojiPreview, { fontSize: listPreviewSize * 0.42 }]}>
                        {draft.emoji}
                      </Text>
                    )}
                    <View style={styles.previewTag}>
                      <Text style={styles.previewTagText}>方图</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={[styles.detailPreview, { width: detailPreviewWidth, height: previewHeight }]}
                    onPress={() => void pickImage('detail')}
                    accessibilityLabel="选择详情横图"
                  >
                    {detailUri ? (
                      <Image
                        key={detailUri}
                        source={{ uri: detailUri }}
                        style={styles.detailImageFill}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.detailPlaceholder}>
                        <FontAwesome name="plus" size={18} color={colors.textMuted} />
                        <Text style={styles.detailPlaceholderText}>横图</Text>
                      </View>
                    )}
                    <View style={styles.previewTag}>
                      <Text style={styles.previewTagText}>横图 · 可选</Text>
                    </View>
                  </Pressable>
                </View>
                <Text style={styles.fieldHint}>方图用于列表；横图用于详情弹窗，未设置时沿用方图或图标</Text>

                <Text style={styles.fieldLabel}>预设图标</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.emojiRow}
                >
                  {PRESET_FAMILY_EMOJIS.map((emoji) => {
                    const selected = draft.imageSource === 'emoji' && draft.emoji === emoji;
                    return (
                      <Pressable
                        key={emoji}
                        style={[styles.emojiChip, selected && styles.emojiChipActive]}
                        onPress={() => selectEmoji(emoji)}
                      >
                        <Text style={styles.emojiChipText}>{emoji}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>称呼</Text>
              <View style={styles.sectionCard}>
                <TextInput
                  style={styles.input}
                  value={draft.name}
                  onChangeText={(name) => {
                    setDraft((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        name,
                        ttsText: ttsTextForName(name, prev.ttsText, prev.name),
                      };
                    });
                  }}
                  placeholder="例如：爸爸、奶奶"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>语音</Text>
                <Pressable style={styles.inlinePreviewBtn} onPress={() => void previewVoice()}>
                  <FontAwesome name="play" size={14} color={colors.primary} />
                  <Text style={styles.inlinePreviewText}>试听</Text>
                </Pressable>
              </View>
              <View style={styles.sectionCard}>
                <View style={styles.modeRow}>
                  {(['tts', 'recording'] as FamilyVoiceMode[]).map((mode) => {
                    const active = draft.voiceMode === mode;
                    return (
                      <Pressable
                        key={mode}
                        style={[styles.modeChip, active && styles.modeChipActive]}
                        onPress={() => updateDraft({ voiceMode: mode })}
                      >
                        <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                          {mode === 'tts' ? '文本生成' : '录制'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {draft.voiceMode === 'tts' ? (
                  <View style={styles.voiceBlock}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={draft.ttsText}
                      onChangeText={(ttsText) => updateDraft({ ttsText })}
                      placeholder={createDefaultTtsText('爸爸')}
                      placeholderTextColor={colors.textMuted}
                      multiline
                    />
                    <Text style={styles.fieldHint}>
                      默认随称呼自动填充；空格表示 0.2 秒停顿
                    </Text>

                    <Text style={styles.fieldLabel}>音色风格</Text>
                    <View style={styles.chipRows}>
                      <View style={styles.chipRow}>
                        {voicePresets.slice(0, 3).map((preset) => {
                          const active =
                            draft.voiceProfile.gender === preset.profile.gender &&
                            draft.voiceProfile.age === preset.profile.age;
                          return (
                            <Pressable
                              key={preset.id}
                              style={[styles.chip, active && styles.chipActive]}
                              onPress={() => updateDraft({ voiceProfile: preset.profile })}
                            >
                              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                {preset.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <View style={styles.chipRow}>
                        {voicePresets.slice(3).map((preset) => {
                          const active =
                            draft.voiceProfile.gender === preset.profile.gender &&
                            draft.voiceProfile.age === preset.profile.age;
                          return (
                            <Pressable
                              key={preset.id}
                              style={[styles.chip, active && styles.chipActive]}
                              onPress={() => updateDraft({ voiceProfile: preset.profile })}
                            >
                              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                {preset.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.voiceBlock}>
                    <Text style={styles.fieldHint}>
                      {recorderState.isRecording
                        ? `录音中 ${Math.max(1, Math.round(recorderState.durationMillis / 1000))} 秒`
                        : recordingUri
                          ? '已保存，可试听、重录或删除'
                          : '录一段招呼语音，保存后可直接播放'}
                    </Text>
                    <View style={styles.recordRow}>
                      {!recorderState.isRecording ? (
                        <Pressable style={styles.primaryBtn} onPress={() => void startRecording()}>
                          <FontAwesome name="microphone" size={18} color="#fff" />
                          <Text style={styles.primaryBtnText}>{recordingUri ? '重录' : '开始录音'}</Text>
                        </Pressable>
                      ) : (
                        <Pressable style={styles.dangerBtn} onPress={() => void stopRecording()}>
                          <FontAwesome name="stop" size={18} color="#fff" />
                          <Text style={styles.primaryBtnText}>停止并保存</Text>
                        </Pressable>
                      )}
                      {recordingUri && !recorderState.isRecording && (
                        <Pressable style={styles.secondaryBtn} onPress={() => void removeRecording()}>
                          <FontAwesome name="trash-o" size={16} color={colors.primary} />
                          <Text style={styles.secondaryBtnText}>删除</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.footerSecondary} onPress={onClose}>
              <Text style={styles.footerSecondaryText}>取消</Text>
            </Pressable>
            <Pressable
              style={[styles.footerPrimary, isSaving && styles.footerDisabled]}
              onPress={() => void handleSave()}
              disabled={isSaving}
            >
              <Text style={styles.footerPrimaryText}>{isSaving ? '保存中…' : '保存'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitleInline: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  fieldLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  fieldHint: {
    marginTop: 10,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  inlinePreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFF4F0',
  },
  inlinePreviewText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  imageGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'center',
  },
  listPreview: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFill: {
    width: '100%',
    height: '100%',
  },
  emojiPreview: {
    textAlign: 'center',
  },
  previewTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  detailPreview: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailImageFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  detailPlaceholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFF8F0',
  },
  detailPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  emojiRow: {
    gap: 8,
    paddingBottom: 4,
  },
  emojiChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFECE8',
  },
  emojiChipText: {
    fontSize: 26,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeChip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  modeChipActive: {
    backgroundColor: colors.primary,
  },
  modeChipText: {
    fontWeight: '700',
    color: '#666',
  },
  modeChipTextActive: {
    color: '#fff',
  },
  voiceBlock: {
    marginTop: 12,
  },
  chipRows: {
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
  },
  recordRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E45757',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  footerSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
  },
  footerSecondaryText: {
    fontWeight: '700',
    color: '#666',
  },
  footerPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  footerPrimaryText: {
    fontWeight: '700',
    color: '#fff',
  },
  footerDisabled: {
    opacity: 0.6,
  },
});
