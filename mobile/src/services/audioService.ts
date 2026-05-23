import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import type { Animal } from '@/src/data/animals';
import type { FamilyTitle } from '@/src/data/familyTitles';
import { getFamilyCallIntro } from '@/src/data/familyTitles';
import { getSoundSource, getTtsSource } from '@/src/data/soundAssets';
import {
  getFamilySpeechOptions,
  resolveFamilySpeechVoice,
} from '@/src/services/familyVoice';

/**
 * 播放状态管理：
 * - `currentToken`：每次新播放或 stop 都自增；旧序列检测到 token 失效后退出
 * - `sharedPlayer`：全局复用一个 AudioPlayer，避免频繁 create/remove 导致 Android 音频资源耗尽
 */
let currentToken = 0;
let sharedPlayer: AudioPlayer | null = null;
let sharedListener: { remove: () => void } | null = null;
let cancelCurrent: (() => void) | null = null;
let abortWait: (() => void) | null = null;
let consecutiveFailures = 0;

let playerLock: Promise<void> = Promise.resolve();

const alive = (token: number) => token === currentToken;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    const id = setTimeout(() => {
      abortWait = null;
      resolve();
    }, ms);
    abortWait = () => {
      clearTimeout(id);
      abortWait = null;
      resolve();
    };
  });

function withPlayerLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = playerLock.then(fn, fn);
  playerLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function detachSharedListener() {
  try {
    sharedListener?.remove();
  } catch {
    /* noop */
  }
  sharedListener = null;
}

function disposeSharedPlayer() {
  detachSharedListener();
  if (!sharedPlayer) return;
  try {
    sharedPlayer.pause();
  } catch {
    /* noop */
  }
  try {
    sharedPlayer.remove();
  } catch {
    /* noop */
  }
  sharedPlayer = null;
}

function ensureSharedPlayer(): AudioPlayer {
  if (!sharedPlayer) {
    sharedPlayer = createAudioPlayer(null, {
      updateInterval: 120,
      keepAudioSessionActive: true,
    });
  }
  return sharedPlayer;
}

type PlayableSource = Parameters<typeof createAudioPlayer>[0];

async function haltPlayback(): Promise<void> {
  abortWait?.();
  abortWait = null;
  try {
    Speech.stop();
  } catch {
    /* noop */
  }
  const cancel = cancelCurrent;
  cancelCurrent = null;
  cancel?.();

  await withPlayerLock(async () => {
    detachSharedListener();
    if (!sharedPlayer) return;
    try {
      sharedPlayer.pause();
      await sharedPlayer.seekTo(0);
    } catch {
      /* noop */
    }
  });
}

/** 开始一次新播放：只递增一次 token，并清理上一段播放 */
async function beginPlayback(): Promise<number> {
  const token = ++currentToken;
  await haltPlayback();
  return token;
}

async function waitUntilLoaded(
  player: AudioPlayer,
  token: number,
  timeoutMs = 5000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!alive(token)) return false;
    if (player.isLoaded) return true;
    await wait(40);
  }
  return alive(token) && player.isLoaded;
}

async function resetAudioEngine(): Promise<void> {
  disposeSharedPlayer();
  cancelCurrent = null;
  try {
    await setIsAudioActiveAsync(false);
    await setIsAudioActiveAsync(true);
    await ensureAudioMode(true);
  } catch {
    /* noop */
  }
}

async function playSource(source: PlayableSource, token: number): Promise<boolean> {
  if (!alive(token)) return false;

  return withPlayerLock(async () => {
    if (!alive(token)) return false;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const player = ensureSharedPlayer();
      detachSharedListener();

      try {
        player.pause();
      } catch {
        /* noop */
      }

      const ok = await new Promise<boolean>((resolve) => {
        let settled = false;

        const finish = (success: boolean) => {
          if (settled) return;
          settled = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          detachSharedListener();
          if (cancelCurrent === cancelHandle) cancelCurrent = null;
          resolve(success);
        };

        const cancelHandle = () => finish(false);
        cancelCurrent = cancelHandle;

        sharedListener = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
          if (status.didJustFinish) finish(true);
        });

        void (async () => {
          try {
            player.replace(source as NonNullable<PlayableSource>);
            const loaded = await waitUntilLoaded(player, token);
            if (!loaded || !alive(token)) {
              finish(false);
              return;
            }
            await player.seekTo(0);
            if (!alive(token)) {
              finish(false);
              return;
            }
            player.play();
          } catch {
            finish(false);
          }
        })();

        timeoutId = setTimeout(() => finish(true), 10000);
      });

      if (ok && alive(token)) {
        consecutiveFailures = 0;
      } else if (!ok) {
        consecutiveFailures += 1;
      }
      return ok && alive(token);
    } catch {
      consecutiveFailures += 1;
      return false;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (consecutiveFailures >= 2) {
        consecutiveFailures = 0;
        void resetAudioEngine();
      }
    }
  });
}

async function speakFallback(
  text: string,
  token: number,
  options: Speech.SpeechOptions = {}
): Promise<void> {
  if (!alive(token)) return;

  await new Promise<void>((resolve) => {
    try {
      Speech.speak(text, {
        language: 'zh-CN',
        rate: 0.9,
        pitch: 1.4,
        ...options,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    } catch {
      resolve();
    }
  });
}

async function ensureAudioMode(force = false) {
  try {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      allowsRecording: false,
    });
  } catch {
    if (!force) return;
  }
}

export const audioService = {
  async playAnimalSound(animal: Animal): Promise<void> {
    if (!animal) return;
    const token = await beginPlayback();

    await ensureAudioMode();
    if (!alive(token)) return;

    const ttsSource = getTtsSource(animal.id);
    let ttsOk = false;
    if (ttsSource) {
      ttsOk = await playSource(ttsSource, token);
    }
    if (!alive(token)) return;

    if (!ttsOk) {
      await speakFallback(`${animal.name}怎么叫`, token);
      if (!alive(token)) return;
    }

    await wait(220);
    if (!alive(token)) return;

    if (animal.sound) {
      const callSource = getSoundSource(animal.sound);
      if (callSource) {
        await playSource(callSource, token);
      }
    }
  },

  async stop(): Promise<void> {
    currentToken++;
    await haltPlayback();
  },

  async speakCallText(text: string): Promise<void> {
    const token = await beginPlayback();
    await ensureAudioMode();
    if (!alive(token)) return;
    await speakFallback(text, token);
  },

  async speakFamilyCall(title: FamilyTitle): Promise<void> {
    const token = await beginPlayback();
    await ensureAudioMode();
    if (!alive(token)) return;

    const base = getFamilySpeechOptions(title);
    const voiceName = await resolveFamilySpeechVoice(title);
    const speechOptions: Speech.SpeechOptions = {
      ...base,
      ...(voiceName ? { voice: voiceName } : {}),
    };

    await speakFallback(getFamilyCallIntro(title.name), token, speechOptions);
    if (!alive(token)) return;

    await wait(750);
    if (!alive(token)) return;

    const charRate = Math.max(0.75, (base.rate ?? 1) * 0.88);
    for (const char of [...title.name]) {
      if (!alive(token)) return;
      await speakFallback(char, token, {
        ...speechOptions,
        rate: charRate,
      });
      if (!alive(token)) return;
      await wait(420);
    }
  },

  async recover(): Promise<void> {
    currentToken++;
    await resetAudioEngine();
  },
};
