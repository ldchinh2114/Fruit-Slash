import {
  FRUIT_DEFINITIONS,
  GAME_CONFIG,
  type FruitId,
} from '../config/gameConfig';

const { difficulty } = GAME_CONFIG;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export class DifficultyManager {
  private elapsed = 0;

  update(elapsedSeconds: number): void {
    this.elapsed = Math.max(0, elapsedSeconds);
  }

  reset(): void {
    this.elapsed = 0;
  }

  get elapsedSeconds(): number {
    return this.elapsed;
  }

  get rampProgress(): number {
    return clamp01(this.elapsed / difficulty.rampSeconds);
  }

  get speedScale(): number {
    return lerp(
      difficulty.speedStart,
      difficulty.speedEnd,
      smoothstep(this.rampProgress),
    );
  }

  get waveInterval(): number {
    return lerp(
      difficulty.waveIntervalStart,
      difficulty.waveIntervalEnd,
      smoothstep(this.rampProgress),
    );
  }

  get level(): number {
    const raw = 1 + Math.floor(this.elapsed / difficulty.levelDurationSeconds);
    return Math.min(difficulty.maxLevel, raw);
  }

  get maxFruitsPerWave(): number {
    return Math.min(
      difficulty.maxFruitsPerWave,
      difficulty.initialMaxFruits +
        Math.floor(this.elapsed / difficulty.waveSizeRampSeconds),
    );
  }

  get minFruitsPerWave(): number {
    return Math.max(2, this.maxFruitsPerWave - 1);
  }

  get bombChance(): number {
    const ramp = smoothstep(this.elapsed / GAME_CONFIG.bomb.chanceRampSeconds);
    const baseChance = lerp(GAME_CONFIG.bomb.baseChance, GAME_CONFIG.bomb.maxChance, ramp);
    const grace = smoothstep(
      (this.elapsed - GAME_CONFIG.bomb.graceSeconds) / GAME_CONFIG.bomb.graceRampSeconds,
    );
    return baseChance * grace;
  }

  get unlockedFruitIds(): FruitId[] {
    return FRUIT_DEFINITIONS.filter(
      (fruit) => fruit.unlockAtSeconds <= this.elapsed,
    ).map((fruit) => fruit.id);
  }
}
