import { useCallback, useEffect, useRef } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { FamilyRelation } from '@/src/data/familyRelations';

type Props = {
  visible: boolean;
  relation: FamilyRelation | null;
  imageUri?: string | null;
  /** 打开后需等待该毫秒数才允许关闭（防连点误关） */
  closeDelayMs?: number;
  onClose: () => void;
  onReplay: () => void;
};

/** 横图弹窗上限（较原 560×320 放大约 1/3） */
const MODAL_MAX_WIDTH = 747;
const MODAL_MAX_HEIGHT = 427;

export function FamilyImageModal({
  visible,
  relation,
  imageUri,
  closeDelayMs = 0,
  onClose,
  onReplay,
}: Props) {
  const { width, height } = useWindowDimensions();
  const openedAtRef = useRef<number | null>(null);
  const modalWidth = Math.min(width * 0.88, MODAL_MAX_WIDTH, width - 48);
  const modalHeight = Math.min(modalWidth * 0.75, height * 0.56, MODAL_MAX_HEIGHT);

  useEffect(() => {
    if (visible) {
      openedAtRef.current = Date.now();
      return;
    }
    openedAtRef.current = null;
  }, [visible]);

  const tryClose = useCallback(() => {
    const openedAt = openedAtRef.current;
    if (openedAt == null) return;
    if (Date.now() - openedAt < closeDelayMs) return;
    onClose();
  }, [closeDelayMs, onClose]);

  if (!relation) return null;

  const showPhoto = Boolean(imageUri);
  const closeGuardActive = closeDelayMs > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={tryClose}>
      <Pressable style={styles.backdrop} onPress={tryClose} accessibilityLabel="关闭">
        <View style={styles.center} pointerEvents="box-none">
          <Pressable
            style={[
              styles.imageFrame,
              {
                width: modalWidth,
                height: modalHeight,
                borderRadius: modalWidth * 0.05,
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onReplay();
            }}
            accessibilityLabel={`重播${relation.name}的语音`}
          >
            {showPhoto && imageUri ? (
              <Image
                key={imageUri}
                source={{ uri: imageUri }}
                style={styles.photo}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.emoji, { fontSize: modalHeight * 0.34 }]}>{relation.emoji}</Text>
            )}
            <View style={styles.replayHint}>
              <Text style={styles.replayHintText}>点击重播</Text>
            </View>
          </Pressable>

          <Text style={styles.name} pointerEvents="none">
            {relation.name}
          </Text>
          <Text style={styles.hint} pointerEvents="none">
            {closeGuardActive
              ? `点击图片重播 · ${(closeDelayMs / 1000).toFixed(1)} 秒后可点空白关闭`
              : '点击图片重播 · 点空白处关闭'}
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  center: {
    width: '100%',
    alignItems: 'center',
  },
  imageFrame: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  emoji: {
    textAlign: 'center',
  },
  replayHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  replayHintText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  name: {
    marginTop: 18,
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
  },
  hint: {
    marginTop: 8,
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
});
