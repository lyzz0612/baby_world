import * as Speech from 'expo-speech';
import type { FamilyGender, FamilyTitle, FamilyVoiceProfile } from '@/src/data/familyTitles';

let zhVoices: Speech.Voice[] | null = null;

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

function guessVoiceGender(name: string): FamilyGender | null {
  const n = name.toLowerCase();
  if (/female|woman|girl|lady|女/.test(n)) return 'female';
  if (/male|man|boy|gent|男/.test(n)) return 'male';
  return null;
}

function scoreVoice(voice: Speech.Voice, profile: FamilyVoiceProfile, titleId: string): number {
  let score = 0;
  const gender = guessVoiceGender(voice.name);
  if (gender === profile.gender) score += 4;
  if (voice.language.toLowerCase().includes('cn')) score += 1;
  if (voice.quality === Speech.VoiceQuality.Enhanced) score += 1;

  let hash = 0;
  for (let i = 0; i < titleId.length; i++) {
    hash = (hash + titleId.charCodeAt(i) * (i + 1)) % 997;
  }
  score += (hash % 3) * 0.01;
  return score;
}

export async function resolveFamilySpeechVoice(title: FamilyTitle): Promise<string | undefined> {
  const voices = await getZhVoices();
  if (voices.length === 0) return undefined;

  const ranked = [...voices].sort(
    (a, b) => scoreVoice(b, title.voice, title.id) - scoreVoice(a, title.voice, title.id)
  );
  return ranked[0]?.name;
}

export function getFamilySpeechOptions(title: FamilyTitle): Speech.SpeechOptions {
  return {
    language: 'zh-CN',
    pitch: title.voice.pitch,
    rate: title.voice.rate,
  };
}
