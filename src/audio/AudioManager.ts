import type { EventRarity } from '../events/EventTypes';
import type { ExplosionSoundVariant, SoundPackStyle } from '../shop/ShopItem';

const DEFAULT_PROFILE: SoundPackStyle = {
  waveform: 'triangle',
  pitch: 1,
  spread: 1,
  noiseStart: 1200,
  noiseEnd: 80,
  previewColors: [0x7ee8fa, 0xffd166, 0xff6b6b],
};

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.7;
  }
  return Math.min(1, Math.max(0, value));
}

export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabledState = true;
  private volumeState = 0.7;
  private profile: SoundPackStyle = DEFAULT_PROFILE;
  private previewToken = 0;
  private previewTimer = 0;

  get enabled(): boolean {
    return this.enabledState;
  }

  get volume(): number {
    return this.volumeState;
  }

  unlock(): void {
    if (!this.context) {
      try {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.effectiveGain();
        this.master.connect(this.context.destination);
        this.noiseBuffer = this.createNoiseBuffer(this.context);
      } catch {
        this.context = null;
        this.master = null;
        return;
      }
    }
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  setEnabled(enabled: boolean, withFeedback = true): void {
    this.enabledState = enabled;
    this.applyGain();
    if (enabled) {
      this.unlock();
      if (withFeedback) {
        this.playUi();
      }
    }
  }

  setVolume(volume: number): void {
    this.volumeState = clampVolume(volume);
    this.applyGain();
  }

  setPack(style: SoundPackStyle): void {
    this.previewToken += 1;
    this.profile = style;
  }

  configure(enabled: boolean, volume: number): void {
    this.enabledState = enabled;
    this.volumeState = clampVolume(volume);
    this.applyGain();
  }

  previewPack(style: SoundPackStyle): void {
    this.unlock();
    const previous = this.profile;
    const token = this.previewToken + 1;
    this.previewToken = token;
    this.profile = style;
    window.clearTimeout(this.previewTimer);
    this.playUi();
    this.playPop(25);
    this.playBomb('classic');
    this.previewTimer = window.setTimeout(() => {
      if (this.previewToken === token) {
        this.profile = previous;
      }
    }, 900);
  }

  toggle(): boolean {
    this.setEnabled(!this.enabledState);
    return this.enabledState;
  }

  playUi(): void {
    this.playTone(640, 860, 0.07, 0.06);
  }

  playStart(): void {
    this.playTone(392, 392, 0.12, 0.08, 0);
    this.playTone(523.25, 523.25, 0.12, 0.08, 0.09);
    this.playTone(659.25, 783.99, 0.22, 0.09, 0.18);
  }

  playEventStart(rarity: EventRarity): void {
    switch (rarity) {
      case 'legendary':
        this.playTone(523.25, 523.25, 0.16, 0.08, 0);
        this.playTone(659.25, 659.25, 0.16, 0.08, 0.11);
        this.playTone(783.99, 783.99, 0.2, 0.08, 0.22);
        this.playTone(1046.5, 1318.51, 0.38, 0.09, 0.34);
        break;
      case 'epic':
        this.playTone(392, 392, 0.12, 0.07, 0);
        this.playTone(523.25, 523.25, 0.12, 0.08, 0.09);
        this.playTone(783.99, 1046.5, 0.26, 0.08, 0.19);
        break;
      case 'rare':
        this.playTone(587.33, 587.33, 0.11, 0.07, 0);
        this.playTone(880, 880, 0.14, 0.07, 0.09);
        this.playTone(1174.66, 1174.66, 0.2, 0.06, 0.2);
        break;
      case 'uncommon':
        this.playTone(523.25, 783.99, 0.16, 0.07);
        break;
      default:
        this.playTone(660, 880, 0.12, 0.06);
        break;
    }
  }

  playEventWarning(): void {
    this.playTone(220, 220, 0.16, 0.08, 0);
    this.playTone(220, 180, 0.16, 0.08, 0.22);
    this.playTone(220, 150, 0.22, 0.08, 0.44);
  }

  playEventEnd(): void {
    this.playTone(523.25, 392, 0.22, 0.04);
  }

  playPop(points = 10): void {
    const base = 440 + Math.min(points, 50) * 6;
    this.playTone(base, base * 1.45, 0.09, 0.09);
    this.playTone(
      base * 2,
      base * 2 * (1.5 + this.profile.spread * 0.04),
      0.06,
      0.045,
      0.02,
    );
  }

  playMiss(): void {
    this.playTone(230, 150, 0.2, 0.07);
  }

  playBomb(variant: ExplosionSoundVariant = 'classic'): void {
    if (variant === 'electric') {
      this.playNoise(0.42, 0.42, this.profile.noiseStart * 1.7, 220);
      this.playTone(980, 180, 0.32, 0.16);
      this.playTone(180, 60, 0.4, 0.14, 0.03);
      return;
    }
    if (variant === 'cosmic') {
      this.playNoise(0.95, 0.48, this.profile.noiseStart * 0.65, 50);
      this.playTone(84, 30, 0.9, 0.28);
      this.playTone(320, 90, 0.5, 0.08, 0.04);
      return;
    }
    if (variant === 'frost') {
      this.playNoise(0.5, 0.36, this.profile.noiseStart * 2.1, 380);
      this.playTone(1320, 320, 0.42, 0.12);
      this.playTone(660, 220, 0.5, 0.08, 0.03);
      return;
    }
    if (variant === 'toxic') {
      this.playNoise(0.6, 0.34, this.profile.noiseStart * 0.8, 90);
      this.playTone(300, 520, 0.22, 0.12);
      this.playTone(520, 120, 0.38, 0.1, 0.12);
      return;
    }
    if (variant === 'royal') {
      this.playNoise(0.55, 0.3, this.profile.noiseStart * 1.4, 120);
      this.playTone(523.25, 523.25, 0.16, 0.09);
      this.playTone(659.25, 659.25, 0.16, 0.09, 0.1);
      this.playTone(783.99, 1046.5, 0.3, 0.1, 0.2);
      return;
    }
    this.playNoise(0.7, 0.5, this.profile.noiseStart, this.profile.noiseEnd);
    this.playTone(95, 38, 0.55, 0.32);
  }

  playUnlock(): void {
    this.playTone(659.25, 659.25, 0.14, 0.07, 0);
    this.playTone(880, 880, 0.14, 0.07, 0.1);
    this.playTone(1174.66, 1318.51, 0.25, 0.08, 0.2);
  }

  playPurchase(): void {
    this.playTone(523.25, 523.25, 0.1, 0.07, 0);
    this.playTone(783.99, 783.99, 0.12, 0.08, 0.08);
    this.playTone(1046.5, 1318.51, 0.22, 0.07, 0.17);
  }

  playEquip(): void {
    this.playTone(392, 587.33, 0.16, 0.07);
    this.playTone(587.33, 880, 0.2, 0.06, 0.09);
  }

  playError(): void {
    this.playTone(260, 180, 0.16, 0.06);
  }

  playPreview(): void {
    this.playTone(440, 660, 0.12, 0.07);
    this.playTone(660, 990, 0.16, 0.05, 0.09);
  }

  playGameOver(): void {
    this.playTone(392, 392, 0.25, 0.05, 0);
    this.playTone(311.13, 311.13, 0.25, 0.05, 0.16);
    this.playTone(261.63, 246.94, 0.3, 0.06, 0.32);
    this.playTone(196, 146.83, 0.65, 0.08, 0.48);
  }

  dispose(): void {
    window.clearTimeout(this.previewTimer);
    this.previewTimer = 0;
    this.previewToken += 1;
    if (this.context) {
      void this.context.close();
    }
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
  }

  private playTone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    volume: number,
    delay = 0,
  ): void {
    if (!this.enabledState || !this.context || !this.master) {
      return;
    }
    const start = this.context.currentTime + delay;
    const pitch = this.profile.pitch;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = this.profile.waveform;
    oscillator.frequency.setValueAtTime(
      Math.max(20, startFrequency * pitch),
      start,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency * pitch),
      start + duration,
    );
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private playNoise(
    duration: number,
    volume: number,
    fromFrequency: number,
    toFrequency: number,
  ): void {
    if (
      !this.enabledState ||
      !this.context ||
      !this.master ||
      !this.noiseBuffer
    ) {
      return;
    }
    const start = this.context.currentTime;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(
      Math.max(40, fromFrequency * this.profile.pitch),
      start,
    );
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(40, toFrequency),
      start + duration,
    );
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  private applyGain(): void {
    if (!this.master || !this.context) {
      return;
    }
    this.master.gain.setTargetAtTime(
      this.effectiveGain(),
      this.context.currentTime,
      0.02,
    );
  }

  private effectiveGain(): number {
    if (!this.enabledState) {
      return 0;
    }
    return 0.55 * Math.pow(this.volumeState, 1.4);
  }

  private createNoiseBuffer(context: AudioContext): AudioBuffer {
    const length = Math.floor(context.sampleRate * 1.2);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
