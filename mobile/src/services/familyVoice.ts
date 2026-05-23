import * as Speech from 'expo-speech';
import {
  DEFAULT_VOICE_PROFILE,
  type FamilyAgeGroup,
  type FamilyGender,
  type FamilyRelation,
  type FamilyVoiceProfile,
} from '@/src/data/familyRelations';

let cachedVoices: Speech.Voice[] | null = null;
let maleVoiceAvailable: boolean | null = null;

const CHINESE_LANGUAGE_PREFIXES = ['zh', 'cmn', 'yue', 'nan', 'wuu', 'hak'];
const CHINESE_VOICE_NAME_HINTS =
  /ting[\-_]?ting|sin[\-_]?ji|mei[\-_]?jia|xiaoxiao|xiaoyi|huihui|yaoyao|xiaomeng|xiaorong|xiaoyan|lili|qianqian|yunxi|yunyang|kangkang|qige|limu|yunjian|xiaogang|xiaokun|xiaobei|zh-CN|zh-TW|zh-HK|普通话|粤语|国语|中文/i;

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
  detail?: string;
  voice: Speech.Voice;
};

export type DeviceVoiceOptions = {
  chinese: ZhVoiceOption[];
  other: ZhVoiceOption[];
  totalDeviceCount: number;
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

function normalizeLanguageCode(language: string): string {
  return language.trim().toLowerCase().replace(/_/g, '-');
}

function languagePrefix(language: string): string {
  return normalizeLanguageCode(language).split('-')[0] ?? '';
}

function isChineseRelatedVoice(voice: Speech.Voice): boolean {
  const lang = normalizeLanguageCode(voice.language);
  const prefix = languagePrefix(voice.language);
  if (CHINESE_LANGUAGE_PREFIXES.includes(prefix)) return true;
  if (/^(zh|cmn|yue|nan|wuu|hak)/.test(lang)) return true;
  if (/[\u4e00-\u9fff]/.test(voice.name)) return true;
  return CHINESE_VOICE_NAME_HINTS.test(voiceSearchBlob(voice));
}

const GENERIC_VOICE_NAME =
  /^(zh|cmn|yue|nan|wuu|hak|chinese|mandarin|cantonese|中文|国语|普通话|粤语)([-_\s][a-z]{2,8})?$/i;

function isGenericVoiceName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (GENERIC_VOICE_NAME.test(trimmed)) return true;
  return trimmed.length <= 3;
}

function humanizeVoiceToken(token: string): string {
  const normalized = token.replace(/[_-]+/g, ' ').trim();
  if (!normalized) return token;
  if (/[\u4e00-\u9fff]/.test(normalized)) return normalized;
  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function extractVoiceNameFromIdentifier(identifier: string): string | undefined {
  const id = identifier.trim();
  if (!id) return undefined;

  const googleMatch = id.match(/x-([a-z0-9]+)(?:-(?:local|network|embedded))?/i);
  if (googleMatch?.[1] && !isGenericVoiceName(googleMatch[1])) {
    return humanizeVoiceToken(googleMatch[1]);
  }

  const appleMatch = id.match(/\.([A-Za-z][A-Za-z\-]+)$/);
  if (appleMatch?.[1] && !isGenericVoiceName(appleMatch[1])) {
    return humanizeVoiceToken(appleMatch[1]);
  }

  const tail = id.split(/[:/]/).pop() ?? id;
  const segments = tail.split(/[-_]/).filter(Boolean);
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment && !isGenericVoiceName(segment) && segment.length >= 3) {
      return humanizeVoiceToken(segment);
    }
  }

  return undefined;
}

function extractVoiceDisplayName(voice: Speech.Voice): string {
  const rawName = voice.name?.trim() ?? '';
  if (rawName && !isGenericVoiceName(rawName)) return rawName;

  const fromIdentifier = extractVoiceNameFromIdentifier(voice.identifier ?? '');
  if (fromIdentifier) return fromIdentifier;

  const region = regionLabel(voice.language);
  if (region) return region;

  if (rawName) return rawName.toUpperCase();
  return voiceKey(voice);
}

function regionLabel(language: string): string | undefined {
  const normalized = normalizeLanguageCode(language);
  if (normalized.includes('hk') || normalized.startsWith('yue')) return '粤语';
  if (normalized.includes('tw') || normalized.includes('hant')) return '繁中';
  if (normalized.includes('cn') || normalized.includes('hans') || normalized.startsWith('cmn')) {
    return '普通话';
  }
  if (normalized.startsWith('zh')) return '中文';
  return undefined;
}

function formatVoiceLabel(voice: Speech.Voice): { label: string; detail?: string } {
  const name = extractVoiceDisplayName(voice);
  const region = regionLabel(voice.language);
  const quality =
    voice.quality === Speech.VoiceQuality.Enhanced
      ? '增强'
      : voice.quality === Speech.VoiceQuality.Default
        ? undefined
        : String(voice.quality);
  const detailParts = [region, quality].filter(Boolean);
  return {
    label: name,
    detail: detailParts.length > 0 ? detailParts.join(' · ') : undefined,
  };
}

function toVoiceOption(voice: Speech.Voice): ZhVoiceOption {
  const formatted = formatVoiceLabel(voice);
  return {
    id: voiceKey(voice),
    label: formatted.detail ? `${formatted.label} · ${formatted.detail}` : formatted.label,
    detail: formatted.detail,
    voice,
  };
}

function dedupeVoiceOptions(options: ZhVoiceOption[]): ZhVoiceOption[] {
  const byLabel = new Map<string, ZhVoiceOption>();
  for (const option of options) {
    const key = option.label.trim().toLowerCase();
    const existing = byLabel.get(key);
    if (!existing) {
      byLabel.set(key, option);
      continue;
    }
    if (voiceQualityScore(option.voice) > voiceQualityScore(existing.voice)) {
      byLabel.set(key, option);
    }
  }
  return [...byLabel.values()];
}

export function hasDistinctVoiceChoices(options: ZhVoiceOption[]): boolean {
  if (options.length === 0) return false;
  const labels = new Set(options.map((option) => option.label.trim().toLowerCase()));
  if (labels.size >= 2) return true;
  const only = options[0]?.label ?? '';
  return !isGenericVoiceName(only) && !/^中文$|^普通话$|^粤语$|^繁中$/.test(only);
}

async function getAllVoices(forceRefresh = false): Promise<Speech.Voice[]> {
  if (cachedVoices && !forceRefresh) return cachedVoices;
  try {
    cachedVoices = await Speech.getAvailableVoicesAsync();
  } catch {
    cachedVoices = [];
  }
  return cachedVoices;
}

async function getChineseVoices(forceRefresh = false): Promise<Speech.Voice[]> {
  return sortVoices((await getAllVoices(forceRefresh)).filter(isChineseRelatedVoice));
}

export function invalidateDeviceVoiceCache(): void {
  cachedVoices = null;
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
  preferredVoiceId?: string,
  allVoices?: Speech.Voice[]
): string | undefined {
  if (preferredVoiceId) {
    const searchPool = allVoices ?? voices;
    const matched = searchPool.find((voice) => voiceKey(voice) === preferredVoiceId);
    if (matched) return voiceKey(matched);
  }

  const { malePool, femalePool } = buildGenderPools(voices);
  const pool = profile.gender === 'male' ? malePool : femalePool;
  const ageIndex = profile.age === 'elder' ? 0 : profile.age === 'adult' ? 1 : 2;
  const voice = pool[ageIndex % Math.max(pool.length, 1)] ?? pool[0] ?? voices[0];
  return voice ? voiceKey(voice) : undefined;
}

export async function listDeviceVoiceOptions(
  forceRefresh = false
): Promise<DeviceVoiceOptions> {
  const all = sortVoices(await getAllVoices(forceRefresh));
  const chineseVoices = all.filter(isChineseRelatedVoice);
  const chineseKeys = new Set(chineseVoices.map(voiceKey));
  const otherVoices = all.filter((voice) => !chineseKeys.has(voiceKey(voice)));

  return {
    chinese: dedupeVoiceOptions(chineseVoices.map(toVoiceOption)),
    other: dedupeVoiceOptions(otherVoices.map(toVoiceOption)),
    totalDeviceCount: all.length,
  };
}

export async function listZhVoiceOptions(forceRefresh = false): Promise<ZhVoiceOption[]> {
  const { chinese } = await listDeviceVoiceOptions(forceRefresh);
  return chinese;
}

export async function resolveRelationSpeechProfile(
  relation: FamilyRelation
): Promise<FamilySpeechProfile> {
  const voices = sortVoices(await getAllVoices());
  const chineseVoices = voices.filter(isChineseRelatedVoice);
  const { hasMaleVoice } = buildGenderPools(chineseVoices.length > 0 ? chineseVoices : voices);
  maleVoiceAvailable = hasMaleVoice;

  const profile = relation.voiceProfile ?? DEFAULT_VOICE_PROFILE;
  const voice = resolveVoiceForProfile(
    profile,
    chineseVoices.length > 0 ? chineseVoices : voices,
    relation.ttsVoiceId,
    voices
  );
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
  const all = sortVoices(await getAllVoices());
  const matched = all.find((voice) => voiceKey(voice) === voiceId);
  return matched ? formatVoiceLabel(matched).label : undefined;
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
