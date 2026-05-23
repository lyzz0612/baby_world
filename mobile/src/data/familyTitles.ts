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
    voice: { gender: 'male', age: 'adult', pitch: 0.82, rate: 0.92 },
  },
  {
    id: 'mama',
    name: '妈妈',
    emoji: '👩',
    voice: { gender: 'female', age: 'adult', pitch: 1.14, rate: 0.94 },
  },
  {
    id: 'yeye',
    name: '爷爷',
    emoji: '👴',
    voice: { gender: 'male', age: 'elder', pitch: 0.72, rate: 0.82 },
  },
  {
    id: 'nainai',
    name: '奶奶',
    emoji: '👵',
    voice: { gender: 'female', age: 'elder', pitch: 0.96, rate: 0.84 },
  },
  {
    id: 'waigong',
    name: '外公',
    emoji: '🧓',
    voice: { gender: 'male', age: 'elder', pitch: 0.76, rate: 0.86 },
  },
  {
    id: 'waipo',
    name: '外婆',
    emoji: '👵',
    voice: { gender: 'female', age: 'elder', pitch: 0.98, rate: 0.86 },
  },
  {
    id: 'jiujiu',
    name: '舅舅',
    emoji: '👨',
    voice: { gender: 'male', age: 'adult', pitch: 0.88, rate: 0.96 },
  },
  {
    id: 'jiuma',
    name: '舅妈',
    emoji: '👩',
    voice: { gender: 'female', age: 'adult', pitch: 1.1, rate: 0.98 },
  },
  {
    id: 'gugu',
    name: '姑姑',
    emoji: '👩',
    voice: { gender: 'female', age: 'adult', pitch: 1.16, rate: 0.97 },
  },
  {
    id: 'xiaoyi',
    name: '小姨',
    emoji: '👩',
    voice: { gender: 'female', age: 'adult', pitch: 1.22, rate: 1.02 },
  },
  {
    id: 'gege',
    name: '哥哥',
    emoji: '👦',
    voice: { gender: 'male', age: 'child', pitch: 1.06, rate: 1.06 },
  },
  {
    id: 'jiejie',
    name: '姐姐',
    emoji: '👧',
    voice: { gender: 'female', age: 'child', pitch: 1.24, rate: 1.05 },
  },
  {
    id: 'didi',
    name: '弟弟',
    emoji: '👦',
    voice: { gender: 'male', age: 'child', pitch: 1.18, rate: 1.1 },
  },
  {
    id: 'meimei',
    name: '妹妹',
    emoji: '👧',
    voice: { gender: 'female', age: 'child', pitch: 1.32, rate: 1.12 },
  },
];

export function getFamilyCallIntro(name: string): string {
  return `我是${name}，快跟我叫`;
}

/** @deprecated 使用 getFamilyCallIntro + 逐字朗读 */
export function getFamilyCallPhrase(name: string): string {
  return `${getFamilyCallIntro(name)}${name}`;
}
