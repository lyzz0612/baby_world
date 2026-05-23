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
  listZhVoiceOptions,
  type ZhVoiceOption,
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
    images: { listImageUri?: string | null; detailImageUri?: string | null }
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
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [voiceOptions, setVoiceOptions] = useState<ZhVoiceOption[]>([]);
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
    void getFamilyRecordingUri(relation.id).then(setRecordingUri);
  }, [visible, relation, listImageUri, detailImageUri]);

  useEffect(() => {
    if (!visible) return;
    void listZhVoiceOptions().then(setVoiceOptions);
  }, [visible]);

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
      onSave(normalized, { listImageUri: listUri, detailImageUri: detailUri });
    } finally {
      setIsSaving(false);
    }
  }, [draft, detailUri, listUri, onSave, recordingUri]);

  if (!draft) return null;

  const editorWidth = Math.min(width - 32, 520);
  const imagePreviewSize = Math.min(editorWidth - 48, 160);

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
            <Text style={styles.sectionLabel}>头像</Text>
            <View style={styles.imageRow}>
              <Pressable
                style={[styles.imagePreview, { width: imagePreviewSize, height: imagePreviewSize }]}
                onPress={() => void pickImage('list')}
                accessibilityLabel="选择正方形头像"
              >
                {draft.imageSource === 'photo' && listUri ? (
                  <Image key={listUri} source={{ uri: listUri }} style={styles.imageFill} />
                ) : (
                  <Text style={[styles.emojiPreview, { fontSize: imagePreviewSize * 0.45 }]}>
                    {draft.emoji}
                  </Text>
                )}
                <View style={styles.imageBadge}>
                  <Text style={styles.imageBadgeText}>列表方图</Text>
                </View>
              </Pressable>

              <View style={styles.imageActions}>
                <Pressable style={styles.actionBtn} onPress={() => void pickImage('list')}>
                  <FontAwesome name="image" size={16} color={colors.primary} />
                  <Text style={styles.actionBtnText}>相册 · 方图</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => void pickImage('detail')}>
                  <FontAwesome name="picture-o" size={16} color={colors.primary} />
                  <Text style={styles.actionBtnText}>相册 · 横图</Text>
                </Pressable>
                <Text style={styles.imageHint}>列表用正方形，详情弹窗优先显示横图</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>预设图标</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
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

            <Text style={styles.sectionLabel}>称呼</Text>
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

            <Text style={styles.sectionLabel}>语音</Text>
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
                <Text style={styles.helperText}>
                  默认：我是称呼，跟我叫称呼（随称呼自动填充，手动改过则不再覆盖）
                </Text>
                <Text style={styles.helperText}>空格表示停顿 0.2 秒，例如：我是 爸爸 跟我叫 爸爸</Text>

                <Text style={styles.subLabel}>音色风格</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {voicePresets.map((preset) => {
                    const active =
                      draft.voiceProfile.gender === preset.profile.gender &&
                      draft.voiceProfile.age === preset.profile.age;
                    return (
                      <Pressable
                        key={preset.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() =>
                          updateDraft({
                            voiceProfile: preset.profile,
                            ttsVoiceId: undefined,
                          })
                        }
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {preset.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {voiceOptions.length > 0 && (
                  <>
                    <Text style={styles.subLabel}>系统音色</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                      {voiceOptions.map((option) => {
                        const active = draft.ttsVoiceId === option.id;
                        return (
                          <Pressable
                            key={option.id}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => updateDraft({ ttsVoiceId: option.id })}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.voiceBlock}>
                <Text style={styles.helperText}>
                  {recorderState.isRecording
                    ? `录音中 ${Math.max(1, Math.round(recorderState.durationMillis / 1000))} 秒`
                    : recordingUri
                      ? '已保存录音，可预览、重录或删除'
                      : '点击开始录制一段招呼语音'}
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

            <Pressable style={styles.previewBtn} onPress={() => void previewVoice()}>
              <FontAwesome name="play" size={16} color={colors.primary} />
              <Text style={styles.previewBtnText}>预览语音</Text>
            </Pressable>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  subLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  imageRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  imagePreview: {
    borderRadius: 18,
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
  imageBadge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  imageBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  imageActions: {
    flex: 1,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF4F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  imageHint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
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
    minHeight: 88,
    textAlignVertical: 'top',
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
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
  chipRow: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
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
  previewBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#FFF4F0',
  },
  previewBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
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
