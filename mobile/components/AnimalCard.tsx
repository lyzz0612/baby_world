import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import type { Animal } from '@/src/data/animals';
import { colors } from '@/src/theme/colors';

type Props = {
  animal: Animal;
  isPlaying?: boolean;
  onPress: () => void;
};

/**
 * 1A 交互：点击卡片直接播叫声；
 * 播放中卡片高亮 + emoji 持续轻微抖动，与 fd0b6f72 Modal 内的 shake 动画语义一致。
 */
export function AnimalCard({ animal, isPlaying = false, onPress }: Props) {
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPlaying) {
      shake.stopAnimation();
      shake.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, {
          toValue: 1,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: -1,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isPlaying, shake]);

  const rotate = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg'],
  });
  const scale = shake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [1.05, 1, 1.05],
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isPlaying && styles.cardActive,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityLabel={animal.name}
      accessibilityRole="button"
    >
      <Animated.Text
        style={[styles.emoji, { transform: [{ rotate }, { scale }] }]}
      >
        {animal.emoji}
      </Animated.Text>
      <Text style={[styles.name, isPlaying && styles.nameActive]}>
        {animal.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    flex: 1,
    margin: 6,
    minHeight: 120,
  },
  cardActive: {
    backgroundColor: colors.primaryLight,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  emoji: {
    fontSize: 56,
    lineHeight: 64,
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  nameActive: {
    color: '#fff',
  },
});
