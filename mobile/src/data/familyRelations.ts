export type FamilyAgeGroup = 'elder' | 'adult' | 'child';
export type FamilyGender = 'male' | 'female';

export type FamilyVoiceProfile = {
  gender: FamilyGender;
  age: FamilyAgeGroup;
  pitch: number;
  rate: number;
};

export type FamilyVoiceMode = 'tts' | 'recording';

export type FamilyImageSource = 'emoji' | 'photo';

export type FamilyRelation = {
  id: string;
  name: string;
  emoji: string;
  imageSource: FamilyImageSource;
  voiceMode: FamilyVoiceMode;
  /** TTS 文案，空格表示 0.2 秒停顿 */
  ttsText: string;
  ttsVoiceId?: string;
  voiceProfile: FamilyVoiceProfile;
  createdAt: number;
};

/** @deprecated 使用 FamilyRelation */
export type FamilyTitle = FamilyRelation;

export const FAMILY_TTS_PAUSE_MS = 200;

export const PRESET_FAMILY_EMOJIS = [
  '👨',
  '👩',
  '👴',
  '👵',
  '🧓',
  '👦',
  '👧',
  '👶',
  '🧑',
  '👨‍👩‍👧',
  '💑',
  '🤱',
] as const;

export const DEFAULT_VOICE_PROFILE: FamilyVoiceProfile = {
  gender: 'female',
  age: 'adult',
  pitch: 1.1,
  rate: 0.88,
};

export function createDefaultTtsText(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return `我是${trimmed}，跟我叫${trimmed}`;
}

/** 文案为空，或与当前称呼对应的默认模板一致，视为「跟随称呼」 */
export function isAutoTtsText(name: string, ttsText: string): boolean {
  const trimmedTts = ttsText.trim();
  if (!trimmedTts) return true;
  return trimmedTts === createDefaultTtsText(name);
}

export function ttsTextForName(name: string, currentTtsText: string, previousName: string): string {
  if (!isAutoTtsText(previousName, currentTtsText)) {
    return currentTtsText;
  }
  return createDefaultTtsText(name);
}

export function createEmptyRelation(id: string): FamilyRelation {
  return {
    id,
    name: '',
    emoji: PRESET_FAMILY_EMOJIS[0],
    imageSource: 'emoji',
    voiceMode: 'tts',
    ttsText: '',
    voiceProfile: { ...DEFAULT_VOICE_PROFILE },
    createdAt: Date.now(),
  };
}

export function normalizeRelation(relation: FamilyRelation): FamilyRelation {
  const name = relation.name.trim();
  return {
    ...relation,
    name,
    emoji: relation.emoji || PRESET_FAMILY_EMOJIS[0],
    ttsText: relation.ttsText.trim() ? relation.ttsText : createDefaultTtsText(name),
    voiceProfile: relation.voiceProfile ?? { ...DEFAULT_VOICE_PROFILE },
  };
}

export function splitTtsSegments(text: string): string[] {
  return text
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
