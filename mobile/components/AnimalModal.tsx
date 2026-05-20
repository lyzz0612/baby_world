import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Animal } from '@/src/data/animals';
import { audioService } from '@/src/services/audioService';
import { colors } from '@/src/theme/colors';

type Props = {
  animal: Animal;
  onClose: () => void;
};

/**
 * 由父组件按 `selectedAnimal ? <AnimalModal/> : null` 控制挂载。
 * 内部 Native Modal 始终 visible，避免 props 与挂载状态二者并存导致逻辑歧义。
 */
export function AnimalModal({ animal, onClose }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const playTokenRef = useRef(0);

  const handlePlay = async () => {
    const token = ++playTokenRef.current;
    await audioService.stop();
    setIsPlaying(true);
    try {
      await audioService.playAnimalSound(animal);
    } finally {
      if (playTokenRef.current === token) {
        setIsPlaying(false);
      }
    }
  };

  const handleClose = () => {
    playTokenRef.current++;
    void audioService.stop();
    onClose();
  };

  useEffect(() => {
    void handlePlay();
    return () => {
      playTokenRef.current++;
      void audioService.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal.id]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <Pressable
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={12}
            accessibilityLabel="关闭"
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <View style={styles.display}>
            <Text style={[styles.emoji, isPlaying && styles.emojiAnim]}>
              {animal.emoji}
            </Text>
            <Text style={styles.name}>{animal.name}</Text>
          </View>

          <View style={styles.soundSection}>
            {isPlaying ? (
              <View style={styles.waves}>
                <View style={[styles.wave, styles.wave1]} />
                <View style={[styles.wave, styles.wave2]} />
                <View style={[styles.wave, styles.wave3]} />
              </View>
            ) : (
              <Pressable style={styles.replayButton} onPress={handlePlay}>
                <Text style={styles.replayText}>▶ 再听一次</Text>
              </Pressable>
            )}
            <Text style={styles.soundHint}>
              {isPlaying ? `${animal.name}怎么叫...` : ' '}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 32,
    paddingVertical: 40,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  display: {
    marginBottom: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 120,
    lineHeight: 130,
    marginBottom: 12,
  },
  emojiAnim: {
    transform: [{ rotate: '3deg' }],
  },
  name: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
  },
  soundSection: {
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  waves: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    height: 40,
    alignItems: 'flex-end',
  },
  wave: {
    width: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    height: 32,
  },
  wave1: { height: 20 },
  wave2: { height: 36 },
  wave3: { height: 24 },
  replayButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginBottom: 8,
  },
  replayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  soundHint: {
    fontSize: 16,
    color: '#777',
    minHeight: 22,
  },
});
