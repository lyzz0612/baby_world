import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import type { Animal } from '@/src/data/animals';
import { getSoundSource, getTtsSource } from '@/src/data/soundAssets';

/**
 * 播放状态管理：
 * - `currentToken`：每次 `playAnimalSound` 或 `stop()` 都自增；旧序列检测到 token 失效后退出
 * - `currentPlayer`：当前在播的 AudioPlayer，仅供 stop 时定位
 * - `cancelCurrent`：在飞的 playSource 的 finish(false) 回调；stop() 立即解开
 */
let currentToken = 0;
let currentPlayer: AudioPlayer | null = null;
let cancelCurrent: (() => void) | null = null;

const alive = (token: number) => token === currentToken;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function safeRemove(player: AudioPlayer | null) {
  if (!player) return;
  try {
    player.pause();
  } catch {
    /* noop */
  }
  try {
    player.remove();
  } catch {
    /* noop */
  }
}

type PlayableSource = Parameters<typeof createAudioPlayer>[0];

async function playSource(source: PlayableSource, token: number): Promise<boolean> {
  if (!alive(token)) return false;

  let player: AudioPlayer | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    player = createAudioPlayer(source);
    if (!alive(token)) {
      safeRemove(player);
      return false;
    }
    currentPlayer = player;

    const ok = await new Promise<boolean>((resolve) => {
      let settled = false;

      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        try {
          sub.remove();
        } catch {
          /* noop */
        }
        if (cancelCurrent === cancelHandle) cancelCurrent = null;
        resolve(success);
      };

      const cancelHandle = () => finish(false);
      cancelCurrent = cancelHandle;

      const sub = player!.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (status.didJustFinish) finish(true);
      });

      try {
        player!.play();
      } catch {
        finish(false);
        return;
      }

      // 兜底：极少数文件不触发 didJustFinish 时不卡死
      timeoutId = setTimeout(() => finish(true), 8000);
    });

    return ok && alive(token);
  } catch {
    return false;
  } finally {
    if (player) {
      if (currentPlayer === player) currentPlayer = null;
      safeRemove(player);
    }
  }
}

async function speakFallback(text: string, token: number): Promise<void> {
  if (!alive(token)) return;

  await new Promise<void>((resolve) => {
    try {
      Speech.speak(text, {
        language: 'zh-CN',
        rate: 0.9,
        pitch: 1.4,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    } catch {
      resolve();
    }
  });
}

let audioModeReady = false;
async function ensureAudioMode() {
  if (audioModeReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      allowsRecording: false,
    });
    audioModeReady = true;
  } catch {
    /* noop */
  }
}

export const audioService = {
  /** 顺序：预生成 TTS mp3 → 真实叫声；TTS mp3 缺失时退回系统 TTS 朗读「xxx怎么叫」 */
  async playAnimalSound(animal: Animal): Promise<void> {
    if (!animal) return;
    const token = ++currentToken;

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
    try {
      Speech.stop();
    } catch {
      /* noop */
    }
    const cancel = cancelCurrent;
    cancelCurrent = null;
    cancel?.();
  },
};
