import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FamilyTitle } from '@/src/data/familyTitles';
import { colors } from '@/src/theme/colors';
import type { FamilyCardSize } from '@/src/utils/pagination';

type Props = {
  title: FamilyTitle;
  imageUri?: string | null;
  editMode?: boolean;
  isActive?: boolean;
  onPress: () => void;
  size?: FamilyCardSize;
  imageSize?: number;
};

const NAME_HEIGHT = {
  phone: 34,
  tablet: 38,
  large: 44,
} as const;

const NAME_SIZE = {
  phone: 19,
  tablet: 23,
  large: 28,
} as const;

const EMOJI_SIZE = {
  phone: 0.62,
  tablet: 0.64,
  large: 0.66,
} as const;

export function FamilyCard({
  title,
  imageUri,
  editMode = false,
  isActive = false,
  onPress,
  size = 'phone',
  imageSize,
}: Props) {
  const mediaStyle = imageSize
    ? { width: imageSize, height: imageSize }
    : styles.mediaSquare;

  const emojiSize = imageSize
    ? Math.round(imageSize * EMOJI_SIZE[size])
    : size === 'large'
      ? 72
      : size === 'tablet'
        ? 56
        : 48;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isActive && styles.cardActive,
        editMode && styles.cardEdit,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityLabel={editMode ? `更换${title.name}的照片` : title.name}
      accessibilityRole="button"
    >
      <View style={[styles.mediaArea, mediaStyle]}>
        {imageUri ? (
          <Image
            key={imageUri}
            source={{ uri: imageUri }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.emojiWrap}>
            <Text style={[styles.emoji, { fontSize: emojiSize }]}>{title.emoji}</Text>
          </View>
        )}
        {editMode && (
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>换图</Text>
          </View>
        )}
      </View>

      <View style={[styles.nameBar, { height: NAME_HEIGHT[size] }]}>
        <Text
          style={[
            styles.name,
            { fontSize: NAME_SIZE[size] },
            isActive && styles.nameActive,
          ]}
          numberOfLines={1}
        >
          {title.name}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
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
  mediaArea: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF8F0',
    marginBottom: 8,
  },
  mediaSquare: {
    width: '100%',
    aspectRatio: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  emojiWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
  editBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  editBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  nameBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  name: {
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  nameActive: {
    color: '#fff',
  },
});
