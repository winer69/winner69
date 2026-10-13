// =====================================================
// Audio Manager
// - ถ้า USE_SOUND_FILES = true จะเล่นไฟล์จาก /sounds/*.mp3
// - ถ้าไฟล์ไม่มี/โหลดไม่ได้ → ใช้เสียงสังเคราะห์ (Web Audio) แทน
// - ทุกการเล่นเสียงถูกห่อด้วย try/catch → เกมไม่มีวัน Error เพราะเสียง
// =====================================================

import { USE_SOUND_FILES } from '../game/constants.js';

export const SOUND_FILES = {
  card_deal: '/sounds/card_deal.mp3',
  card_flip: '/sounds/card_flip.mp3',
  chip: '/sounds/chip.mp3',
  click: '/sounds/click.mp3',
  check: '/sounds/check.mp3',
  call: '/sounds/call.mp3',
  raise: '/sounds/raise.mp3',
  fold: '/sounds/fold.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3',
};

// เสียงสังเคราะห์: [ความถี่ Hz, ความยาว s, รูปคลื่น, ระดับเสียง, เวลาเริ่ม s]
const SYNTH = {
  card_deal: [[900, 0.05, 'triangle', 0.08, 0]],
  card_flip: [[1300, 0.04, 'square', 0.04, 0], [700, 0.05, 'triangle', 0.06, 0.03]],
  chip: [[2200, 0.04, 'square', 0.035, 0], [2900, 0.05, 'square', 0.03, 0.05]],
  click: [[600, 0.03, 'sine', 0.08, 0]],
  check: [[420, 0.06, 'sine', 0.12, 0], [420, 0.06, 'sine', 0.12, 0.1]],
  call: [[2400, 0.04, 'square', 0.03, 0], [2000, 0.05, 'square', 0.03, 0.06]],
  raise: [[1800, 0.04, 'square', 0.03, 0], [2400, 0.04, 'square', 0.03, 0.05], [3000, 0.06, 'square', 0.03, 0.1]],
  fold: [[260, 0.12, 'sine', 0.08, 0]],
  win: [[523, 0.14, 'triangle', 0.12, 0], [659, 0.14, 'triangle', 0.12, 0.12], [784, 0.14, 'triangle', 0.12, 0.24], [1047, 0.35, 'triangle', 0.14, 0.36]],
  lose: [[392, 0.18, 'sine', 0.09, 0], [330, 0.28, 'sine', 0.08, 0.16]],
};

class AudioManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.8;
    this.cache = {};
    this.broken = new Set();
    this.ctx = null;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
  }

  /** ต้องถูกเรียกจาก user gesture ครั้งแรก (นโยบาย autoplay ของ browser) */
  unlock() {
    try {
      const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (Ctx && !this.ctx) this.ctx = new Ctx();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      /* ignore */
    }
  }

  playFile(name) {
    const src = SOUND_FILES[name];
    if (!src || this.broken.has(name) || typeof Audio === 'undefined') return false;
    try {
      if (!this.cache[name]) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.addEventListener('error', () => this.broken.add(name));
        this.cache[name] = audio;
      }
      const node = this.cache[name].cloneNode();
      node.volume = this.volume;
      const result = node.play();
      if (result && result.catch) result.catch(() => this.broken.add(name));
      return true;
    } catch {
      this.broken.add(name);
      return false;
    }
  }

  playSynth(name) {
    const notes = SYNTH[name];
    if (!notes || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      notes.forEach(([freq, duration, wave, gain, offset]) => {
        const osc = this.ctx.createOscillator();
        const amp = this.ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, now + offset);
        amp.gain.setValueAtTime(0.0001, now + offset);
        amp.gain.exponentialRampToValueAtTime(gain * this.volume, now + offset + 0.008);
        amp.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
        osc.connect(amp).connect(this.ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + duration + 0.02);
      });
    } catch {
      /* ignore */
    }
  }

  play(name) {
    if (!this.enabled) return;
    if (USE_SOUND_FILES && !this.broken.has(name) && this.playFile(name)) return;
    this.playSynth(name);
  }
}

export const audioManager = new AudioManager();
