export type FamilyTitle = {
  id: string;
  name: string;
  emoji: string;
};

/** 常见家人称呼，TTS 文案：我是{name}，快跟我叫{name} */
export const FAMILY_TITLES: FamilyTitle[] = [
  { id: 'baba', name: '爸爸', emoji: '👨' },
  { id: 'mama', name: '妈妈', emoji: '👩' },
  { id: 'yeye', name: '爷爷', emoji: '👴' },
  { id: 'nainai', name: '奶奶', emoji: '👵' },
  { id: 'waigong', name: '外公', emoji: '🧓' },
  { id: 'waipo', name: '外婆', emoji: '👵' },
  { id: 'gege', name: '哥哥', emoji: '👦' },
  { id: 'jiejie', name: '姐姐', emoji: '👧' },
  { id: 'didi', name: '弟弟', emoji: '👦' },
  { id: 'meimei', name: '妹妹', emoji: '👧' },
];

export function getFamilyCallPhrase(name: string): string {
  return `我是${name}，快跟我叫${name}`;
}
