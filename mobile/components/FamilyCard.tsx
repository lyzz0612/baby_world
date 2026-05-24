import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FamilyRelation } from '@/src/data/familyRelations';
import { colors } from '@/src/theme/colors';
import type { FamilyCardSize } from '@/src/utils/pagination';

type Props = {
  relation: FamilyRelation;
  imageUri?: string | null;
  editMode?: boolean;
  selected?: boolean;
  isActive?: boolean;
  onPress: () => void;
  onSelectPress?: () => void;
  disabled?: boolean;
  size?: FamilyCardSize;
  imageSize?: number;
};

type AddCardProps = {
  onPress: () => void;
  size?: FamilyCardSize;
  imageSize?: number;
  label?: string;
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

export function FamilyAddCard({
  onPress,
  size = 'phone',
  imageSize,
  label = '添加关系',
}: AddCardProps) {
  return (
    <View style={[styles.card, styles.addCard]}>
      <Pressable
        style={({ pressed }) => [styles.cardBody, pressed && styles.cardPressed]}
        onPress={onPress}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <View style={[styles.mediaArea, styles.mediaSquare, styles.addMedia]}>
          <FontAwesome
            name="plus"
            size={imageSize ? imageSize * 0.28 : size === 'large' ? 42 : size === 'tablet' ? 36 : 30}
            color={colors.primary}
          />
        </View>
        <View style={[styles.nameBar, { height: NAME_HEIGHT[size] }]}>
          <Text style={[styles.name, styles.addName, { fontSize: NAME_SIZE[size] }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export function FamilyCard({
  relation,
  imageUri,
  editMode = false,
  selected = false,
  isActive = false,
  onPress,
  onSelectPress,
  disabled = false,
  size = 'phone',
  imageSize,
}: Props) {
  const emojiSize = imageSize
    ? Math.round(imageSize * EMOJI_SIZE[size])
    : size === 'large'
      ? 72
      : size === 'tablet'
        ? 56
        : 48;

  const showPhoto = Boolean(imageUri);

  return (
    <View
      style={[
        styles.card,
        isActive && styles.cardActive,
        editMode && styles.cardEdit,
        editMode && selected && styles.cardSelected,
      ]}
    >
      {editMode && (
        <Pressable
          style={[styles.selectBadge, selected && styles.selectBadgeActive]}
          onPress={onSelectPress}
          hitSlop={8}
          disabled={disabled}
          accessibilityLabel={`${selected ? '取消选中' : '选中'}${relation.name}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
        >
          {selected && <FontAwesome name="check" size={12} color="#fff" />}
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [styles.cardBody, pressed && !disabled && styles.cardPressed]}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={editMode ? `编辑${relation.name}` : relation.name}
        accessibilityRole="button"
      >
        <View style={[styles.mediaArea, styles.mediaSquare]}>
          {showPhoto && imageUri ? (
            <Image
              key={`${relation.id}:${editMode ? 'edit' : 'view'}`}
              source={{ uri: imageUri }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.emojiWrap}>
              <Text style={[styles.emoji, { fontSize: emojiSize }]}>{relation.emoji}</Text>
            </View>
          )}
          {editMode && (
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>编辑</Text>
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
            {relation.name}
          </Text>
        </View>
      </Pressable>
    </View>
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
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    width: '100%',
  },
  cardBody: {
    width: '100%',
    alignItems: 'center',
  },
  addCard: {
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: '#FFF9F6',
  },
  cardActive: {
    backgroundColor: colors.primaryLight,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  cardEdit: {
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  cardSelected: {
    borderColor: colors.primary,
    borderStyle: 'solid',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  selectBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBadgeActive: {
    backgroundColor: colors.primary,
  },
  mediaArea: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF8F0',
    marginBottom: 8,
  },
  addMedia: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1EA',
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
  addName: {
    color: colors.primary,
  },
  nameActive: {
    color: '#fff',
  },
});
