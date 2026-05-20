import { Pressable, StyleSheet, Text } from 'react-native';
import type { Animal } from '@/src/data/animals';

type Props = {
  animal: Animal;
  onPress: () => void;
};

export function AnimalCard({ animal, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <Text style={styles.emoji}>{animal.emoji}</Text>
      <Text style={styles.name}>{animal.name}</Text>
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
});
