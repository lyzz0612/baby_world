import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

// 自增 token。stop() 时令 token 失效，已派发的播放序列会自行退出。
let currentToken = 0;
let currentAudio = null;

const alive = (token) => token === currentToken;

// 动物叫声放大倍数。1.0 = 原始音量；>1 会通过 Web Audio 放大。
// 经过 DynamicsCompressorNode 限幅，不会爆音。
const SOUND_GAIN = 2.6;

let audioCtx = null;
function getAudioCtx() {
  if (audioCtx) return audioCtx;
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
  } catch {
    return null;
  }
  return audioCtx;
}

function tryPlayAudio(url, token, { gain = 1.0 } = {}) {
  return new Promise((resolve) => {
    if (!url || !alive(token)) {
      resolve(false);
      return;
    }
    let audio;
    try {
      audio = new Audio(url);
    } catch {
      resolve(false);
      return;
    }
    audio.preload = 'auto';
    currentAudio = audio;

    // 通过 Web Audio API 放大 + 压缩限幅。失败则普通播放。
    if (gain !== 1.0) {
      const ctx = getAudioCtx();
      if (ctx) {
        try {
          if (ctx.state === 'suspended') ctx.resume();
          const src = ctx.createMediaElementSource(audio);
          const gainNode = ctx.createGain();
          gainNode.gain.value = gain;
          // 压缩器防止放大后爆音
          const comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -10;
          comp.knee.value = 20;
          comp.ratio.value = 6;
          comp.attack.value = 0.003;
          comp.release.value = 0.1;
          src.connect(gainNode).connect(comp).connect(ctx.destination);
        } catch (e) {
          // createMediaElementSource 在某些 WebView 中可能受限；忽略即可
          console.warn('Web Audio gain setup failed, fallback to raw audio:', e);
        }
      }
    }

    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (currentAudio === audio) currentAudio = null;
      resolve(ok);
    };

    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    audio.onpause = () => {
      if (audio.ended || audio.currentTime === 0) finish(true);
    };
    setTimeout(() => finish(true), 8000);

    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => finish(false));
    }
  });
}

// 系统 TTS 仅作为预生成 mp3 缺失时的兜底
async function speakNative(text, token) {
  try {
    await TextToSpeech.speak({
      text,
      lang: 'zh-CN',
      rate: 0.9,
      pitch: 1.4,
      volume: 1.0,
      category: 'ambient',
    });
  } catch (e) {
    if (!alive(token)) return;
    console.warn('Native TTS failed, fallback to web speech', e);
    await speakWeb(text, token);
  }
}

function speakWeb(text, token) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.85;
    u.pitch = 1.6;
    u.onend = () => setTimeout(resolve, 100);
    u.onerror = () => resolve();
    window.speechSynthesis.cancel();
    if (!alive(token)) {
      resolve();
      return;
    }
    window.speechSynthesis.speak(u);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const audioService = {
  // 顺序：预生成 TTS "xxx怎么叫"（onended）→ 短暂停顿 → 真实叫声（onended）
  async playAnimalSound(animal) {
    if (!animal) return;
    const token = ++currentToken;

    const ttsUrl = `/sounds/tts/${animal.id}.mp3`;
    const ttsOk = await tryPlayAudio(ttsUrl, token);
    if (!alive(token)) return;

    if (!ttsOk) {
      // 预生成的 TTS 缺失，回退到系统 TTS（仍可能没声音，但是兜底）
      if (isNative()) {
        await speakNative(`${animal.name}怎么叫`, token);
      } else {
        await speakWeb(`${animal.name}怎么叫`, token);
      }
      if (!alive(token)) return;
    }

    await wait(220);
    if (!alive(token)) return;

    if (animal.sound) {
      await tryPlayAudio(animal.sound, token, { gain: SOUND_GAIN });
    }
  },

  async stop() {
    currentToken++;
    try {
      if (currentAudio) {
        try { currentAudio.pause(); } catch { /* noop */ }
        try { currentAudio.currentTime = 0; } catch { /* noop */ }
        currentAudio.src = '';
        currentAudio = null;
      }
    } catch { /* noop */ }
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch { /* noop */ }
    try {
      if (isNative()) {
        await TextToSpeech.stop();
      }
    } catch { /* noop */ }
  },
};
