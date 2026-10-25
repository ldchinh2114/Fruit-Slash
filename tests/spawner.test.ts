import * as THREE from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { EVENT_SYSTEM_CONFIG } from '../src/config/eventConfig';
import type { FruitId, PlayBounds } from '../src/config/gameConfig';
import { FruitSpawner } from '../src/entities/FruitSpawner';
import type { FruitVisualFactory } from '../src/entities/Fruit';
import type { BombVisualFactory } from '../src/entities/Bomb';
import type { DifficultyManager } from '../src/game/DifficultyManager';

const BOUNDS: PlayBounds = {
  left: -6,
  right: 6,
  top: 6,
  bottom: -4.5,
};

function createSpawner() {
  const missed: string[] = [];
  const difficulty = {
    waveInterval: 9999,
    speedScale: 1,
    minFruitsPerWave: 0,
    maxFruitsPerWave: 0,
    bombChance: 0,
    unlockedFruitIds: ['apple', 'orange'] as FruitId[],
  } as unknown as DifficultyManager;
  const fruitFactory = {
    createFruit: () => new THREE.Group(),
  } as unknown as FruitVisualFactory;
  const bombFactory = {
    createBomb: () => new THREE.Group(),
  } as unknown as BombVisualFactory;
  const spawner = new FruitSpawner(
    new THREE.Scene(),
    fruitFactory,
    bombFactory,
    difficulty,
    () => BOUNDS,
    {
      onFruitMissed: (fruit) => {
        missed.push(fruit.definition.id);
      },
    },
  );
  return { spawner, missed };
}

describe('FruitSpawner event bursts', () => {
  let spawner: FruitSpawner | null = null;

  afterEach(() => {
    spawner?.dispose();
    spawner = null;
  });

  it('clamps event bursts to per-burst, bomb and global entity limits', () => {
    const harness = createSpawner();
    spawner = harness.spawner;
    const { limits } = EVENT_SYSTEM_CONFIG;

    expect(spawner.spawnFruitBurst(50)).toBe(limits.maxFruitsPerBurst);
    expect(spawner.totalEntityCount).toBe(limits.maxFruitsPerBurst);

    expect(spawner.spawnBombBurst(50)).toBe(limits.maxBombsPerBurst);
    expect(spawner.totalEntityCount).toBe(
      limits.maxFruitsPerBurst + limits.maxBombsPerBurst,
    );

    const remainingSlots =
      limits.maxActiveEntities -
      limits.maxFruitsPerBurst -
      limits.maxBombsPerBurst;
    expect(spawner.spawnFruitBurst(50)).toBe(remainingSlots);
    expect(spawner.totalEntityCount).toBe(limits.maxActiveEntities);
    expect(spawner.spawnBombBurst(50)).toBe(0);
    expect(spawner.spawnFruitBurst(50)).toBe(0);

    spawner.update(1);
    expect(spawner.pendingCount).toBe(0);
    expect(spawner.totalEntityCount).toBeLessThanOrEqual(
      limits.maxActiveEntities,
    );
    expect(spawner.activeBombs.length).toBe(limits.maxBombsPerBurst);
  });

  it('creates special fruits with multipliers, auras and limited lifetime', () => {
    const harness = createSpawner();
    spawner = harness.spawner;

    expect(spawner.spawnSpecialFruitBurst('golden', 3, 4, 1)).toBe(3);
    spawner.update(0.2);

    expect(spawner.activeFruits).toHaveLength(3);
    for (const fruit of spawner.activeFruits) {
      expect(fruit.special).toBe('golden');
      expect(fruit.scoreMultiplier).toBe(4);
      expect(fruit.aura).not.toBeNull();
      fruit.enteredPlayfield = true;
      fruit.group.position.set(0, 0, 0);
      fruit.velocity.set(0, 0, 0);
    }

    spawner.update(0.6, 0.1);
    expect(harness.missed).toHaveLength(0);
    expect(spawner.activeFruits).toHaveLength(3);

    // Special lifetime uses real seconds even while fruit motion is slowed.
    spawner.update(0.5, 0.1);
    expect(harness.missed).toHaveLength(3);
    expect(spawner.activeFruits).toHaveLength(0);
  });

  it('removes expired special fruit without double-reporting a miss', () => {
    const harness = createSpawner();
    spawner = harness.spawner;

    expect(spawner.spawnSpecialFruitBurst('rainbow', 1, 6, 1)).toBe(1);
    spawner.update(0.1);
    const fruit = spawner.activeFruits[0];
    expect(fruit.special).toBe('rainbow');
    fruit.enteredPlayfield = true;
    fruit.group.position.set(0, 0, 0);
    fruit.velocity.set(0, 0, 0);

    spawner.update(0.6, 0.1);
    spawner.update(0.6, 0.1);

    expect(harness.missed).toEqual([fruit.definition.id]);
    expect(spawner.activeFruits).toHaveLength(0);
  });
});
