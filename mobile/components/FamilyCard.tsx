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
  phone: 64,
  tablet: 80,
  large: 96,
} as const;

export function FamilyCard({
  title,
  imageUri,
  editMode = false,
  isActive = false,
  onPress,
  size = 'phone',
}: Props) {
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
      <View style={styles.mediaArea}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.emojiWrap}>
            <Text style={[styles.emoji, { fontSize: EMOJI_SIZE[size] }]}>{title.emoji}</Text>
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
    flex: 1,
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
    flex: 1,
    width: '100%',
    minHeight: 0,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF8F0',
    marginBottom: 8,
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
