import { Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { FamilyRelation } from '@/src/data/familyRelations';

type Props = {
  visible: boolean;
  relation: FamilyRelation | null;
  imageUri?: string | null;
  onClose: () => void;
  onReplay: () => void;
};

export function FamilyImageModal({ visible, relation, imageUri, onClose, onReplay }: Props) {
  const { width, height } = useWindowDimensions();
  const modalWidth = Math.min(width * 0.88, 560, width - 48);
  const modalHeight = Math.min(modalWidth * 0.72, height * 0.42, 320);

  if (!relation) return null;

  const showPhoto = relation.imageSource === 'photo' && imageUri;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="关闭">
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
            {showPhoto ? (
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
            点击图片重播 · 点空白处关闭
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
