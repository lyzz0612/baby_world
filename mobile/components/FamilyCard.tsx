import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FamilyTitle } from '@/src/data/familyTitles';
import { colors } from '@/src/theme/colors';
import type { AnimalCardSize } from '@/src/utils/pagination';

type Props = {
  title: FamilyTitle;
  imageUri?: string | null;
  editMode?: boolean;
  isActive?: boolean;
  onPress: () => void;
  size?: AnimalCardSize;
};

const SIZE_STYLES = {
  phone: { emoji: 56, image: 72, name: 18, padV: 16, margin: 6 },
  tablet: { emoji: 72, image: 92, name: 22, padV: 18, margin: 8 },
  large: { emoji: 96, image: 120, name: 28, padV: 22, margin: 10 },
} as const;

export function FamilyCard({
  title,
  imageUri,
  editMode = false,
  isActive = false,
  onPress,
  size = 'phone',
}: Props) {
  const sz = SIZE_STYLES[size];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          paddingVertical: sz.padV,
          margin: sz.margin,
        },
        isActive && styles.cardActive,
        editMode && styles.cardEdit,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityLabel={editMode ? `更换${title.name}的照片` : title.name}
      accessibilityRole="button"
    >
      <View style={[styles.mediaWrap, { width: sz.image, height: sz.image }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <Text style={[styles.emoji, { fontSize: sz.emoji, lineHeight: sz.emoji + 8 }]}>
            {title.emoji}
          </Text>
        )}
        {editMode && (
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>换图</Text>
          </View>
        )}
      </View>
      <Text style={[styles.name, { fontSize: sz.name }, isActive && styles.nameActive]}>
        {title.name}
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
  cardEdit: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  mediaWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    textAlign: 'center',
  },
  editBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  editBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  name: {
    fontWeight: '700',
    color: '#333',
  },
  nameActive: {
    color: '#fff',
  },
});
