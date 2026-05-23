import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import type { Animal } from '@/src/data/animals';
import { colors } from '@/src/theme/colors';

import type { AnimalCardSize } from '@/src/utils/pagination';

type Props = {
  animal: Animal;
  isPlaying?: boolean;
  onPress: () => void;
  size?: AnimalCardSize;
};

const SIZE_STYLES = {
  phone: { emoji: 56, lineHeight: 64, name: 18, padV: 16, margin: 6 },
  tablet: { emoji: 72, lineHeight: 80, name: 22, padV: 18, margin: 8 },
  large: { emoji: 96, lineHeight: 104, name: 28, padV: 22, margin: 10 },
} as const;

/**
 * 1A 交互：点击卡片直接播叫声；
 * 播放中卡片高亮 + emoji 持续轻微抖动，与 fd0b6f72 Modal 内的 shake 动画语义一致。
 */
export function AnimalCard({ animal, isPlaying = false, onPress, size = 'phone' }: Props) {
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

  const sz = SIZE_STYLES[size];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          paddingVertical: sz.padV,
          margin: sz.margin,
        },
        isPlaying && styles.cardActive,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityLabel={animal.name}
      accessibilityRole="button"
    >
      <Animated.Text
        style={[
          styles.emoji,
          {
            fontSize: sz.emoji,
            lineHeight: sz.lineHeight,
          },
          { transform: [{ rotate }, { scale }] },
        ]}
      >
        {animal.emoji}
      </Animated.Text>
      <Text
        style={[
          styles.name,
          { fontSize: sz.name },
          isPlaying && styles.nameActive,
        ]}
      >
        {animal.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    flex: 1,
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
    marginBottom: 8,
  },
  name: {
    fontWeight: '700',
    color: '#333',
  },
  nameActive: {
    color: '#fff',
  },
});
