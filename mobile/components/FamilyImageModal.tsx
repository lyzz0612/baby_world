import { Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { FamilyTitle } from '@/src/data/familyTitles';
import { colors } from '@/src/theme/colors';

type Props = {
  visible: boolean;
  title: FamilyTitle | null;
  imageUri?: string | null;
  onClose: () => void;
};

export function FamilyImageModal({ visible, title, imageUri, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const modalSize = Math.min(width, height) * 0.72;

  if (!title) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="关闭">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.imageFrame,
              {
                width: modalSize,
                height: modalSize,
                borderRadius: modalSize * 0.08,
              },
            ]}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
            ) : (
              <Text style={[styles.emoji, { fontSize: modalSize * 0.42 }]}>
                {title.emoji}
              </Text>
            )}
          </View>
          <Text style={styles.name}>{title.name}</Text>
          <Text style={styles.hint}>听一听，跟着叫叫看吧～</Text>
          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
            onPress={onClose}
            accessibilityLabel="关闭"
          >
            <Text style={styles.closeText}>关闭</Text>
          </Pressable>
        </Pressable>
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
  sheet: {
    width: '100%',
    maxWidth: 520,
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
  },
  emoji: {
    textAlign: 'center',
  },
  name: {
    marginTop: 20,
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
  },
  hint: {
    marginTop: 8,
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
  },
  closeButton: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  closePressed: {
    opacity: 0.85,
  },
  closeText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '700',
  },
});
