import * as THREE from 'three';
import {
  GAME_CONFIG,
  getFruitDefinition,
  type FruitDefinition,
  type FruitId,
  type PlayBounds,
} from '../config/gameConfig';
import { EVENT_SYSTEM_CONFIG } from '../config/eventConfig';
import type { DifficultyManager } from '../game/DifficultyManager';
import { Bomb, type BombVisualFactory } from './Bomb';
import {
  Fruit,
  type FruitSpecialKind,
  type FruitVisualFactory,
} from './Fruit';

export interface FruitSpawnerEvents {
  onFruitMissed(fruit: Fruit): void;
}

interface SpecialSpawnSpec {
  readonly kind: FruitSpecialKind;
  readonly multiplier: number;
  readonly lifetime: number;
}

type PendingSpawn =
  | {
      kind: 'fruit';
      definition: FruitDefinition;
      laneFraction: number;
      delay: number;
      special?: SpecialSpawnSpec;
    }
  | { kind: 'bomb'; laneFraction: number; delay: number };

const ENTITY_LIMITS = EVENT_SYSTEM_CONFIG.limits;

export class FruitSpawner {
  private readonly fruits: Fruit[] = [];
  private readonly bombs: Bomb[] = [];
  private pending: PendingSpawn[] = [];
  private nextWaveIn: number = GAME_CONFIG.spawner.firstWaveDelay;
  private timeSinceBomb: number = GAME_CONFIG.bomb.minSpawnInterval;
  private lastFruitId: FruitId | null = null;
  private readonly auraTexture: THREE.DataTexture;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly fruitFactory: FruitVisualFactory,
    private readonly bombFactory: BombVisualFactory,
    private readonly difficulty: DifficultyManager,
    private readonly getBounds: () => PlayBounds,
    private readonly events: FruitSpawnerEvents,
  ) {
    this.auraTexture = createAuraTexture();
  }

  get activeFruits(): readonly Fruit[] {
    return this.fruits;
  }

  get activeBombs(): readonly Bomb[] {
    return this.bombs;
  }

  get totalEntityCount(): number {
    return this.fruits.length + this.bombs.length + this.pending.length;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  reset(): void {
    for (const fruit of this.fruits) {
      this.disposeFruit(fruit);
    }
    for (const bomb of this.bombs) {
      this.scene.remove(bomb.group);
    }
    this.fruits.length = 0;
    this.bombs.length = 0;
    this.pending = [];
    this.nextWaveIn = GAME_CONFIG.spawner.firstWaveDelay;
    this.timeSinceBomb = GAME_CONFIG.bomb.minSpawnInterval;
    this.lastFruitId = null;
  }

  dispose(): void {
    this.reset();
    this.auraTexture.dispose();
  }

  update(deltaSeconds: number, motionScale = 1): void {
    const delta = Number.isFinite(deltaSeconds)
      ? Math.max(0, deltaSeconds)
      : 0;
    const scale = Number.isFinite(motionScale)
      ? Math.min(1.5, Math.max(0.1, motionScale))
      : 1;
    const motionDelta = delta * scale;
    this.timeSinceBomb += delta;

    for (let index = this.pending.length - 1; index >= 0; index -= 1) {
      const pendingSpawn = this.pending[index];
      pendingSpawn.delay -= delta;
      if (pendingSpawn.delay > 0) {
        continue;
      }
      this.pending.splice(index, 1);
      if (pendingSpawn.kind === 'fruit') {
        this.spawnFruit(
          pendingSpawn.definition,
          pendingSpawn.laneFraction,
          pendingSpawn.special,
        );
      } else {
        this.spawnBomb(pendingSpawn.laneFraction);
      }
    }

    this.nextWaveIn -= delta;
    if (this.nextWaveIn <= 0) {
      this.spawnWave();
      this.nextWaveIn = this.difficulty.waveInterval;
    }

    const bounds = this.getBounds();
    const speedScale = this.difficulty.speedScale;
    const gravity = GAME_CONFIG.gravity * speedScale * speedScale;

    for (let index = this.fruits.length - 1; index >= 0; index -= 1) {
      const fruit = this.fruits[index];
      fruit.update(motionDelta, gravity);
      if (!fruit.enteredPlayfield && fruit.group.position.y >= bounds.bottom) {
        fruit.enteredPlayfield = true;
      }
      if (fruit.special) {
        this.updateSpecialFruit(fruit, delta);
        if (fruit.missed) {
          this.removeFruitAt(index);
          continue;
        }
      }
      this.checkFruitAvailability(fruit, bounds);

      if (this.isEntityGone(fruit.group.position, fruit.radius, bounds)) {
        this.removeFruitAt(index);
      }
    }

    for (let index = this.bombs.length - 1; index >= 0; index -= 1) {
      const bomb = this.bombs[index];
      bomb.update(motionDelta, gravity);
      if (this.isEntityGone(bomb.group.position, bomb.radius, bounds)) {
        this.removeBombAt(index);
      }
    }
  }

  /** Schedules a fruit burst without exceeding the global entity budget. */
  spawnFruitBurst(count: number): number {
    const available = Math.min(
      Math.floor(count),
      ENTITY_LIMITS.maxFruitsPerBurst,
      this.freeEntitySlots,
    );
    for (let index = 0; index < available; index += 1) {
      this.pending.push({
        kind: 'fruit',
        definition: getFruitDefinition(this.pickFruitId()),
        laneFraction: burstLane(index, available),
        delay: index * ENTITY_LIMITS.fruitBurstStaggerSeconds,
      });
    }
    return Math.max(0, available);
  }

  spawnSpecialFruitBurst(
    kind: FruitSpecialKind,
    count: number,
    multiplier: number,
    lifetimeSeconds: number,
  ): number {
    const available = Math.min(
      Math.floor(count),
      ENTITY_LIMITS.maxFruitsPerBurst,
      this.freeEntitySlots,
    );
    const special: SpecialSpawnSpec = {
      kind,
      multiplier,
      lifetime: lifetimeSeconds,
    };
    for (let index = 0; index < available; index += 1) {
      this.pending.push({
        kind: 'fruit',
        definition: getFruitDefinition(this.pickFruitId()),
        laneFraction: burstLane(index, available),
        delay: index * ENTITY_LIMITS.fruitBurstStaggerSeconds,
        special,
      });
    }
    return Math.max(0, available);
  }

  spawnBombBurst(count: number): number {
    const available = Math.min(
      Math.floor(count),
      ENTITY_LIMITS.maxBombsPerBurst,
      this.bombSlots,
      this.freeEntitySlots,
    );
    for (let index = 0; index < available; index += 1) {
      this.pending.push({
        kind: 'bomb',
        laneFraction: burstLane(index, available),
        delay: index * ENTITY_LIMITS.bombBurstStaggerSeconds,
      });
    }
    return Math.max(0, available);
  }

  removeFruit(fruit: Fruit): void {
    const index = this.fruits.indexOf(fruit);
    if (index >= 0) {
      this.removeFruitAt(index);
    }
  }

  removeBomb(bomb: Bomb): void {
    const index = this.bombs.indexOf(bomb);
    if (index >= 0) {
      this.removeBombAt(index);
    }
  }

  private spawnWave(): void {
    const minFruits = this.difficulty.minFruitsPerWave;
    const maxFruits = this.difficulty.maxFruitsPerWave;
    const desired =
      minFruits + Math.floor(Math.random() * (maxFruits - minFruits + 1));
    const count = Math.min(
      desired,
      this.freeEntitySlots,
      GAME_CONFIG.spawner.maxPendingSpawns - this.pending.length,
    );
    const laneSpread = GAME_CONFIG.fruit.laneSpread;

    for (let index = 0; index < count; index += 1) {
      const laneStep = laneSpread / Math.max(1, count);
      const jitter = (Math.random() - 0.5) * 0.35;
      const spawnLane = clamp01(
        0.5 - laneSpread / 2 + (index + 0.5) * laneStep + jitter * laneStep,
      );
      const delay =
        index * GAME_CONFIG.spawner.waveStagger * (0.7 + Math.random() * 0.6);
      this.pending.push({
        kind: 'fruit',
        definition: getFruitDefinition(this.pickFruitId()),
        laneFraction: Math.min(0.96, Math.max(0.04, spawnLane)),
        delay,
      });
    }

    if (
      this.timeSinceBomb >= GAME_CONFIG.bomb.minSpawnInterval &&
      Math.random() < this.difficulty.bombChance &&
      this.pending.length < GAME_CONFIG.spawner.maxPendingSpawns &&
      this.bombSlots > 0 &&
      this.freeEntitySlots > 0
    ) {
      this.timeSinceBomb = 0;
      this.pending.push({
        kind: 'bomb',
        laneFraction: 0.1 + Math.random() * 0.8,
        delay: Math.random() * 0.35,
      });
    }
  }

  private pickFruitId(): FruitId {
    const unlocked = this.difficulty.unlockedFruitIds;
    let id = unlocked[Math.floor(Math.random() * unlocked.length)];
    if (unlocked.length > 1 && id === this.lastFruitId) {
      const currentIndex = unlocked.indexOf(id);
      id = unlocked[(currentIndex + 1) % unlocked.length];
    }
    this.lastFruitId = id;
    return id;
  }

  private spawnFruit(
    definition: FruitDefinition,
    laneFraction: number,
    special?: SpecialSpawnSpec,
  ): void {
    const bounds = this.getBounds();
    const width = bounds.right - bounds.left;
    const centerX = (bounds.left + bounds.right) / 2;
    const x =
      bounds.left +
      width *
        (0.5 - GAME_CONFIG.fruit.laneSpread / 2) +
      width * GAME_CONFIG.fruit.laneSpread * laneFraction;
    const depth = randomRange(
      GAME_CONFIG.fruit.spawnDepthMin,
      GAME_CONFIG.fruit.spawnDepthMax,
    );
    const scale = randomRange(
      GAME_CONFIG.fruit.scaleMin,
      GAME_CONFIG.fruit.scaleMax,
    );
    const speedScale = this.difficulty.speedScale;
    const visibleHeight = bounds.top - bounds.bottom;
    const apexHeight =
      visibleHeight *
      randomRange(
        GAME_CONFIG.fruit.apexHeightRatioMin,
        GAME_CONFIG.fruit.apexHeightRatioMax,
      );
    const verticalSpeed =
      Math.sqrt(2 * GAME_CONFIG.gravity * apexHeight) * speedScale;
    const horizontalSpeed =
      ((centerX - x) * 0.12 +
        width *
          randomRange(
            -GAME_CONFIG.fruit.horizontalSpeedRatio,
            GAME_CONFIG.fruit.horizontalSpeedRatio,
          )) *
      speedScale *
      0.55;

    const group = this.fruitFactory.createFruit(definition);
    const fruit = new Fruit(definition, group, scale);
    if (special) {
      fruit.makeSpecial(special.kind, special.multiplier, special.lifetime);
      this.attachAura(fruit, special.kind);
    }
    group.position.set(
      x,
      bounds.bottom - GAME_CONFIG.fruit.spawnBelowEdge,
      depth,
    );
    group.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );
    fruit.launch(
      new THREE.Vector3(horizontalSpeed, verticalSpeed, 0),
      new THREE.Vector3(
        randomRange(-GAME_CONFIG.fruit.spinSpeedMax, GAME_CONFIG.fruit.spinSpeedMax),
        randomRange(-GAME_CONFIG.fruit.spinSpeedMax, GAME_CONFIG.fruit.spinSpeedMax),
        randomRange(-GAME_CONFIG.fruit.spinSpeedMax, GAME_CONFIG.fruit.spinSpeedMax),
      ),
    );
    this.scene.add(group);
    this.fruits.push(fruit);
  }

  private spawnBomb(laneFraction: number): void {
    const bounds = this.getBounds();
    const width = bounds.right - bounds.left;
    const centerX = (bounds.left + bounds.right) / 2;
    const x = bounds.left + width * (0.5 + (laneFraction - 0.5) * 0.72);
    const scale = randomRange(
      GAME_CONFIG.bomb.scaleMin,
      GAME_CONFIG.bomb.scaleMax,
    );
    const speedScale = this.difficulty.speedScale;
    const visibleHeight = bounds.top - bounds.bottom;
    const apexHeight =
      visibleHeight *
      randomRange(
        GAME_CONFIG.bomb.apexHeightRatioMin,
        GAME_CONFIG.bomb.apexHeightRatioMax,
      );
    const verticalSpeed =
      Math.sqrt(2 * GAME_CONFIG.gravity * apexHeight) * speedScale;
    const horizontalSpeed =
      ((centerX - x) * 0.08 +
        width *
          randomRange(
            -GAME_CONFIG.bomb.horizontalSpeedRatio,
            GAME_CONFIG.bomb.horizontalSpeedRatio,
          )) *
      speedScale *
      0.5;

    const group = this.bombFactory.createBomb();
    const bomb = new Bomb(group, scale);
    group.position.set(
      x,
      bounds.bottom - GAME_CONFIG.fruit.spawnBelowEdge,
      randomRange(GAME_CONFIG.fruit.spawnDepthMin, GAME_CONFIG.fruit.spawnDepthMax),
    );
    group.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    bomb.launch(
      new THREE.Vector3(horizontalSpeed, verticalSpeed, 0),
      new THREE.Vector3(
        randomRange(-0.8, 0.8),
        randomRange(-1.4, 1.4),
        randomRange(-0.8, 0.8),
      ),
    );
    this.scene.add(group);
    this.bombs.push(bomb);
  }

  private attachAura(fruit: Fruit, kind: FruitSpecialKind): void {
    const material = new THREE.SpriteMaterial({
      map: this.auraTexture,
      color: kind === 'golden' ? 0xffd166 : 0xffffff,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.setScalar(fruit.definition.radius * 5.2);
    sprite.renderOrder = 6;
    fruit.group.add(sprite);
    fruit.aura = sprite;
  }

  private updateSpecialFruit(fruit: Fruit, deltaSeconds: number): void {
    fruit.auraTime += deltaSeconds;
    const aura = fruit.aura;
    if (aura && aura instanceof THREE.Sprite) {
      const material = aura.material;
      const pulse = 1 + Math.sin(fruit.auraTime * 6.2) * 0.09;
      aura.scale.setScalar(fruit.definition.radius * 5.2 * pulse);
      if (fruit.special === 'rainbow') {
        material.color.setHSL((fruit.auraTime * 0.45) % 1, 0.95, 0.62);
        material.opacity = 0.55 + 0.25 * Math.sin(fruit.auraTime * 7.4);
      } else {
        material.opacity = 0.62 + 0.24 * Math.sin(fruit.auraTime * 8);
      }
    }
    if (fruit.enteredPlayfield && !fruit.missed) {
      fruit.specialLifetimeRemaining -= deltaSeconds;
      if (fruit.specialLifetimeRemaining <= 0) {
        fruit.missed = true;
        this.events.onFruitMissed(fruit);
      }
    }
  }

  private get freeEntitySlots(): number {
    return Math.max(0, ENTITY_LIMITS.maxActiveEntities - this.totalEntityCount);
  }

  private get bombSlots(): number {
    let pendingBombs = 0;
    for (const spawn of this.pending) {
      if (spawn.kind === 'bomb') {
        pendingBombs += 1;
      }
    }
    return Math.max(
      0,
      ENTITY_LIMITS.maxActiveBombs - this.bombs.length - pendingBombs,
    );
  }

  private checkFruitAvailability(fruit: Fruit, bounds: PlayBounds): void {
    if (fruit.missed || !fruit.enteredPlayfield) {
      return;
    }
    const position = fruit.group.position;
    const leftLimit = bounds.left - fruit.radius * 2.5;
    const rightLimit = bounds.right + fruit.radius * 2.5;
    const bottomLimit = bounds.bottom - fruit.radius * 0.4;
    if (
      position.y < bottomLimit ||
      position.x < leftLimit ||
      position.x > rightLimit
    ) {
      fruit.missed = true;
      this.events.onFruitMissed(fruit);
    }
  }

  private isEntityGone(
    position: THREE.Vector3,
    radius: number,
    bounds: PlayBounds,
  ): boolean {
    const width = bounds.right - bounds.left;
    return (
      position.y < bounds.bottom - 4 ||
      position.x < bounds.left - width * 0.6 ||
      position.x > bounds.right + width * 0.6 ||
      position.y + radius < bounds.bottom - 4
    );
  }

  private removeFruitAt(index: number): void {
    const fruit = this.fruits[index];
    this.disposeFruit(fruit);
    this.fruits.splice(index, 1);
  }

  private disposeFruit(fruit: Fruit): void {
    if (fruit.aura instanceof THREE.Sprite) {
      fruit.aura.material.dispose();
    }
    fruit.aura = null;
    this.scene.remove(fruit.group);
  }

  private removeBombAt(index: number): void {
    const bomb = this.bombs[index];
    this.scene.remove(bomb.group);
    this.bombs.splice(index, 1);
  }
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function burstLane(index: number, count: number): number {
  const step = 0.82 / Math.max(1, count);
  const center = 0.09 + (index + 0.5) * step;
  const jitter = (Math.random() - 0.5) * step * 0.4;
  return clamp01(center + jitter);
}

function createAuraTexture(): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - center) / center;
      const dy = (y - center) / center;
      const distance = Math.min(1, Math.hypot(dx, dy));
      const halo = Math.pow(1 - distance, 2.4);
      const ring = Math.exp(-Math.pow((distance - 0.72) / 0.12, 2)) * 0.35;
      const alpha = Math.min(1, halo * 0.9 + ring);
      const index = (y * size + x) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
