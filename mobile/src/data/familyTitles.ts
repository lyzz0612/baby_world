export type FamilyAgeGroup = 'elder' | 'adult' | 'child';
export type FamilyGender = 'male' | 'female';

export type FamilyVoiceProfile = {
  gender: FamilyGender;
  age: FamilyAgeGroup;
  pitch: number;
  rate: number;
};

export type FamilyTitle = {
  id: string;
  name: string;
  emoji: string;
  voice: FamilyVoiceProfile;
};

/** 常见家人称呼，TTS 文案：我是{name}，快跟我叫{name} */
export const FAMILY_TITLES: FamilyTitle[] = [
  {
    id: 'baba',
    name: '爸爸',
    emoji: '👨',
    voice: { gender: 'male', age: 'adult', pitch: 0.78, rate: 0.86 },
  },
  {
    id: 'mama',
    name: '妈妈',
    emoji: '👩',
    voice: { gender: 'female', age: 'adult', pitch: 1.16, rate: 0.9 },
  },
  {
    id: 'yeye',
    name: '爷爷',
    emoji: '👴',
    voice: { gender: 'male', age: 'elder', pitch: 0.66, rate: 0.78 },
  },
  {
    id: 'nainai',
    name: '奶奶',
    emoji: '👵',
    voice: { gender: 'female', age: 'elder', pitch: 1.0, rate: 0.8 },
  },
  {
    id: 'waigong',
    name: '外公',
    emoji: '🧓',
    voice: { gender: 'male', age: 'elder', pitch: 0.7, rate: 0.8 },
  },
  {
    id: 'waipo',
    name: '外婆',
    emoji: '👵',
    voice: { gender: 'female', age: 'elder', pitch: 1.04, rate: 0.82 },
  },
  {
    id: 'jiujiu',
    name: '舅舅',
    emoji: '👨',
    voice: { gender: 'male', age: 'adult', pitch: 0.82, rate: 0.9 },
  },
  {
    id: 'jiuma',
    name: '舅妈',
    emoji: '👩',
    voice: { gender: 'female', age: 'adult', pitch: 1.12, rate: 0.92 },
  },
  {
    id: 'gugu',
    name: '姑姑',
    emoji: '👩',
    voice: { gender: 'female', age: 'adult', pitch: 1.18, rate: 0.9 },
  },
  {
    id: 'xiaoyi',
    name: '小姨',
    emoji: '👩',
    voice: { gender: 'female', age: 'adult', pitch: 1.24, rate: 0.94 },
  },
  {
    id: 'gege',
    name: '哥哥',
    emoji: '👦',
    voice: { gender: 'male', age: 'child', pitch: 0.94, rate: 0.96 },
  },
  {
    id: 'jiejie',
    name: '姐姐',
    emoji: '👧',
    voice: { gender: 'female', age: 'child', pitch: 1.28, rate: 1.0 },
  },
  {
    id: 'didi',
    name: '弟弟',
    emoji: '👦',
    voice: { gender: 'male', age: 'child', pitch: 1.0, rate: 1.0 },
  },
  {
    id: 'meimei',
    name: '妹妹',
    emoji: '👧',
    voice: { gender: 'female', age: 'child', pitch: 1.34, rate: 1.04 },
  },
];

export function getFamilyCallIntro(name: string): string {
  return `我是${name}，快跟我叫`;
}

/** @deprecated 使用 getFamilyCallIntro + 连贯慢速朗读称呼 */
export function getFamilyCallPhrase(name: string): string {
  return `${getFamilyCallIntro(name)}${name}`;
}
