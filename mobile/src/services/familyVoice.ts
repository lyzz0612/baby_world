import * as Speech from 'expo-speech';
import {
  DEFAULT_VOICE_PROFILE,
  type FamilyAgeGroup,
  type FamilyGender,
  type FamilyRelation,
  type FamilyVoiceProfile,
} from '@/src/data/familyRelations';

let zhVoices: Speech.Voice[] | null = null;
let maleVoiceAvailable: boolean | null = null;

const FEMALE_HINTS =
  /female|woman|girl|lady|miss|aunt|女|ting[\-_]?ting|sin[\-_]?ji|mei[\-_]?jia|xiaoxiao|xiaoyi|huihui|yaoyao|xiaomeng|xiaorong|xiaoyan|lili|qianqian|stacy|susan|sara|zira|xiaobei/i;
const MALE_HINTS =
  /male|man|boy|gent|dad|uncle|男|yunxi|yunyang|kangkang|qige|limu|yunjian|xiaogang|xiaokun|tom|alex|daniel|david|james|aaron|fred|junior|grandpa|grandfather/i;

export type FamilySpeechProfile = {
  voice?: string;
  options: Speech.SpeechOptions;
};

export type ZhVoiceOption = {
  id: string;
  label: string;
  voice: Speech.Voice;
};

function voiceKey(voice: Speech.Voice): string {
  return voice.identifier || voice.name;
}

function voiceSearchBlob(voice: Speech.Voice): string {
  return `${voice.name} ${voice.identifier ?? ''}`.toLowerCase();
}

function classifyVoiceGender(voice: Speech.Voice): FamilyGender | null {
  const blob = voiceSearchBlob(voice);
  if (FEMALE_HINTS.test(blob)) return 'female';
  if (MALE_HINTS.test(blob)) return 'male';
  return null;
}

async function getZhVoices(): Promise<Speech.Voice[]> {
  if (zhVoices) return zhVoices;
  try {
    const all = await Speech.getAvailableVoicesAsync();
    zhVoices = all.filter((v) => v.language.toLowerCase().startsWith('zh'));
  } catch {
    zhVoices = [];
  }
  return zhVoices;
}

function voiceQualityScore(voice: Speech.Voice): number {
  let score = 0;
  if (voice.language.toLowerCase().includes('cn')) score += 2;
  if (voice.quality === Speech.VoiceQuality.Enhanced) score += 1;
  return score;
}

function sortVoices(voices: Speech.Voice[]): Speech.Voice[] {
  return [...voices].sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
}

function buildGenderPools(voices: Speech.Voice[]): {
  malePool: Speech.Voice[];
  femalePool: Speech.Voice[];
  hasMaleVoice: boolean;
} {
  const clearlyMale = voices.filter((v) => classifyVoiceGender(v) === 'male');
  const clearlyFemale = voices.filter((v) => classifyVoiceGender(v) === 'female');
  const unknown = voices.filter((v) => classifyVoiceGender(v) === null);

  const malePool = [
    ...clearlyMale,
    ...unknown.filter((v) => !FEMALE_HINTS.test(voiceSearchBlob(v))),
  ];
  const maleKeys = new Set(malePool.map(voiceKey));
  const femalePool = [
    ...clearlyFemale,
    ...unknown.filter((v) => !maleKeys.has(voiceKey(v)) && !MALE_HINTS.test(voiceSearchBlob(v))),
  ];

  if (femalePool.length === 0) {
    femalePool.push(...clearlyFemale, ...unknown.filter((v) => !maleKeys.has(voiceKey(v))));
  }

  return {
    malePool,
    femalePool,
    hasMaleVoice: clearlyMale.length > 0,
  };
}

function adjustPitchForVoiceAvailability(
  profile: FamilyVoiceProfile,
  pitch: number,
  hasMaleVoice: boolean
): number {
  if (profile.gender === 'male' && !hasMaleVoice) {
    return Math.min(pitch, 0.58);
  }
  if (profile.gender === 'female' && hasMaleVoice) {
    return Math.max(pitch, 1.05);
  }
  return pitch;
}

function resolveVoiceForProfile(
  profile: FamilyVoiceProfile,
  voices: Speech.Voice[],
  preferredVoiceId?: string
): string | undefined {
  if (preferredVoiceId) {
    const matched = voices.find((voice) => voiceKey(voice) === preferredVoiceId);
    if (matched) return voiceKey(matched);
  }

  const { malePool, femalePool } = buildGenderPools(voices);
  const pool = profile.gender === 'male' ? malePool : femalePool;
  const ageIndex = profile.age === 'elder' ? 0 : profile.age === 'adult' ? 1 : 2;
  const voice = pool[ageIndex % Math.max(pool.length, 1)] ?? pool[0] ?? voices[0];
  return voice ? voiceKey(voice) : undefined;
}

export async function listZhVoiceOptions(): Promise<ZhVoiceOption[]> {
  const voices = sortVoices(await getZhVoices());
  return voices.map((voice) => ({
    id: voiceKey(voice),
    label: voice.name || voiceKey(voice),
    voice,
  }));
}

export async function resolveRelationSpeechProfile(
  relation: FamilyRelation
): Promise<FamilySpeechProfile> {
  const voices = sortVoices(await getZhVoices());
  const { hasMaleVoice } = buildGenderPools(voices);
  maleVoiceAvailable = hasMaleVoice;

  const profile = relation.voiceProfile ?? DEFAULT_VOICE_PROFILE;
  const voice = resolveVoiceForProfile(profile, voices, relation.ttsVoiceId);
  const pitch = adjustPitchForVoiceAvailability(profile, profile.pitch, hasMaleVoice);

  return {
    voice,
    options: {
      language: 'zh-CN',
      pitch,
      rate: profile.rate,
    },
  };
}

export async function resolveVoiceLabel(voiceId?: string): Promise<string | undefined> {
  if (!voiceId) return undefined;
  const options = await listZhVoiceOptions();
  return options.find((item) => item.id === voiceId)?.label;
}

export function getDefaultVoiceProfiles(): Array<{
  id: string;
  label: string;
  profile: FamilyVoiceProfile;
}> {
  const slots: Array<{ label: string; profile: FamilyVoiceProfile }> = [
    { label: '男声·长辈', profile: { gender: 'male', age: 'elder', pitch: 0.66, rate: 0.78 } },
    { label: '男声·成年', profile: { gender: 'male', age: 'adult', pitch: 0.78, rate: 0.86 } },
    { label: '男声·少年', profile: { gender: 'male', age: 'child', pitch: 0.94, rate: 0.96 } },
    { label: '女声·长辈', profile: { gender: 'female', age: 'elder', pitch: 1.0, rate: 0.8 } },
    { label: '女声·成年', profile: { gender: 'female', age: 'adult', pitch: 1.16, rate: 0.9 } },
    { label: '女声·少年', profile: { gender: 'female', age: 'child', pitch: 1.28, rate: 1.0 } },
  ];
  return slots.map((slot) => ({
    id: `${slot.profile.gender}-${slot.profile.age}`,
    label: slot.label,
    profile: slot.profile,
  }));
}

/** @deprecated 使用 resolveRelationSpeechProfile */
export async function resolveFamilySpeechProfile(relation: FamilyRelation): Promise<{
  voice?: string;
  intro: Speech.SpeechOptions;
  name: Speech.SpeechOptions;
}> {
  const profile = await resolveRelationSpeechProfile(relation);
  return {
    voice: profile.voice,
    intro: profile.options,
    name: { ...profile.options, rate: Math.min(0.76, profile.options.rate! * 0.82) },
  };
}
