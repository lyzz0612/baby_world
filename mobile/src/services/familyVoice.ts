import * as Speech from 'expo-speech';
import {
  FAMILY_TITLES,
  type FamilyAgeGroup,
  type FamilyGender,
  type FamilyTitle,
} from '@/src/data/familyTitles';

let zhVoices: Speech.Voice[] | null = null;
let titleVoiceMap: Map<string, string> | null = null;
let maleVoiceAvailable: boolean | null = null;

const FEMALE_HINTS =
  /female|woman|girl|lady|miss|aunt|女|ting[\-_]?ting|sin[\-_]?ji|mei[\-_]?jia|xiaoxiao|xiaoyi|huihui|yaoyao|xiaomeng|xiaorong|xiaoyan|lili|qianqian|stacy|susan|sara|zira|xiaobei/i;
const MALE_HINTS =
  /male|man|boy|gent|dad|uncle|男|yunxi|yunyang|kangkang|qige|limu|yunjian|xiaogang|xiaokun|tom|alex|daniel|david|james|aaron|fred|junior|grandpa|grandfather/i;

export const FAMILY_CALL_PAUSE_MS = 850;

export type FamilySpeechProfile = {
  voice?: string;
  intro: Speech.SpeechOptions;
  name: Speech.SpeechOptions;
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

async function buildTitleVoiceMap(): Promise<Map<string, string>> {
  if (titleVoiceMap) return titleVoiceMap;

  const voices = sortVoices(await getZhVoices());
  const { malePool, femalePool, hasMaleVoice } = buildGenderPools(voices);
  maleVoiceAvailable = hasMaleVoice;

  const map = new Map<string, string>();
  const slots: Array<{ gender: FamilyGender; age: FamilyAgeGroup }> = [
    { gender: 'male', age: 'elder' },
    { gender: 'male', age: 'adult' },
    { gender: 'male', age: 'child' },
    { gender: 'female', age: 'elder' },
    { gender: 'female', age: 'adult' },
    { gender: 'female', age: 'child' },
  ];

  for (const slot of slots) {
    const pool = slot.gender === 'male' ? malePool : femalePool;
    const titlesInSlot = FAMILY_TITLES.filter(
      (t) => t.voice.gender === slot.gender && t.voice.age === slot.age
    );

    titlesInSlot.forEach((title, idx) => {
      const voice = pool[idx % Math.max(pool.length, 1)];
      if (voice) {
        map.set(title.id, voiceKey(voice));
      }
    });
  }

  titleVoiceMap = map;
  return map;
}

function adjustPitchForVoiceAvailability(
  title: FamilyTitle,
  pitch: number,
  hasMaleVoice: boolean
): number {
  if (title.voice.gender === 'male' && !hasMaleVoice) {
    return Math.min(pitch, 0.58);
  }
  if (title.voice.gender === 'female' && hasMaleVoice) {
    return Math.max(pitch, 1.05);
  }
  return pitch;
}

export async function resolveFamilySpeechProfile(title: FamilyTitle): Promise<FamilySpeechProfile> {
  const map = await buildTitleVoiceMap();
  const voice = map.get(title.id);
  const hasMaleVoice = maleVoiceAvailable ?? false;

  const introPitch = adjustPitchForVoiceAvailability(title, title.voice.pitch, hasMaleVoice);
  const intro: Speech.SpeechOptions = {
    language: 'zh-CN',
    pitch: introPitch,
    rate: title.voice.rate,
  };

  const name: Speech.SpeechOptions = {
    ...intro,
    rate: Math.min(0.76, title.voice.rate * 0.82),
  };

  return {
    voice,
    intro,
    name,
  };
}

/** @deprecated 使用 resolveFamilySpeechProfile */
export async function resolveFamilySpeechVoice(title: FamilyTitle): Promise<string | undefined> {
  const profile = await resolveFamilySpeechProfile(title);
  return profile.voice;
}

/** @deprecated 使用 resolveFamilySpeechProfile */
export function getFamilySpeechOptions(title: FamilyTitle): Speech.SpeechOptions {
  return {
    language: 'zh-CN',
    pitch: title.voice.pitch,
    rate: title.voice.rate,
  };
}
