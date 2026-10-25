export type FruitId =
  | 'watermelon'
  | 'orange'
  | 'apple'
  | 'lemon'
  | 'kiwi'
  | 'plum'
  | 'peach'
  | 'dragonfruit';

export type FruitShape =
  | 'watermelon'
  | 'orange'
  | 'apple'
  | 'lemon'
  | 'kiwi'
  | 'plum'
  | 'peach'
  | 'dragonfruit';

export interface FruitDefinition {
  readonly id: FruitId;
  readonly name: string;
  readonly points: number;
  readonly unlockAtSeconds: number;
  readonly radius: number;
  readonly color: number;
  readonly accentColor: number;
  readonly fleshColor: number;
  readonly shape: FruitShape;
}

export interface PlayBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export const FRUIT_DEFINITIONS: readonly FruitDefinition[] = [
  {
    id: 'watermelon',
    name: 'Dưa hấu',
    points: 10,
    unlockAtSeconds: 0,
    radius: 0.64,
    color: 0x1f7a3d,
    accentColor: 0x8ee06a,
    fleshColor: 0xff4d6d,
    shape: 'watermelon',
  },
  {
    id: 'orange',
    name: 'Cam',
    points: 15,
    unlockAtSeconds: 0,
    radius: 0.5,
    color: 0xff8a1e,
    accentColor: 0x6fbf3a,
    fleshColor: 0xffb347,
    shape: 'orange',
  },
  {
    id: 'apple',
    name: 'Táo',
    points: 20,
    unlockAtSeconds: 0,
    radius: 0.49,
    color: 0xe5303f,
    accentColor: 0x74b23c,
    fleshColor: 0xfff0c9,
    shape: 'apple',
  },
  {
    id: 'lemon',
    name: 'Chanh',
    points: 25,
    unlockAtSeconds: 0,
    radius: 0.46,
    color: 0xffd93d,
    accentColor: 0x6fbf3a,
    fleshColor: 0xfff3a1,
    shape: 'lemon',
  },
  {
    id: 'kiwi',
    name: 'Kiwi',
    points: 30,
    unlockAtSeconds: 0,
    radius: 0.42,
    color: 0x8a5a2b,
    accentColor: 0x9edb5a,
    fleshColor: 0xa8e26e,
    shape: 'kiwi',
  },
  {
    id: 'plum',
    name: 'Mận',
    points: 35,
    unlockAtSeconds: 30,
    radius: 0.42,
    color: 0x7b2cbf,
    accentColor: 0x3c096c,
    fleshColor: 0xe0aaff,
    shape: 'plum',
  },
  {
    id: 'peach',
    name: 'Đào',
    points: 40,
    unlockAtSeconds: 65,
    radius: 0.47,
    color: 0xff9e7a,
    accentColor: 0x74b23c,
    fleshColor: 0xffc48a,
    shape: 'peach',
  },
  {
    id: 'dragonfruit',
    name: 'Thanh long',
    points: 50,
    unlockAtSeconds: 110,
    radius: 0.53,
    color: 0xe6398f,
    accentColor: 0x8ee06a,
    fleshColor: 0xfff6fa,
    shape: 'dragonfruit',
  },
];

export const GAME_CONFIG = {
  startingLives: 3,
  gravity: 9.8,
  maxDeltaTime: 0.05,
  score: {
    missPenaltyFactor: 0.5,
  },
  fruit: {
    scaleMin: 0.9,
    scaleMax: 1.08,
    apexHeightRatioMin: 0.82,
    apexHeightRatioMax: 0.96,
    horizontalSpeedRatio: 0.075,
    spawnDepthMin: -1.4,
    spawnDepthMax: 0.9,
    spinSpeedMin: 0.4,
    spinSpeedMax: 2.1,
    laneSpread: 0.74,
    spawnBelowEdge: 1.25,
  },
  bomb: {
    radius: 0.48,
    scaleMin: 0.94,
    scaleMax: 1.04,
    baseChance: 0.06,
    maxChance: 0.32,
    chanceRampSeconds: 120,
    graceSeconds: 6,
    graceRampSeconds: 10,
    minSpawnInterval: 4.2,
    apexHeightRatioMin: 0.76,
    apexHeightRatioMax: 0.88,
    horizontalSpeedRatio: 0.05,
  },
  difficulty: {
    rampSeconds: 150,
    waveIntervalStart: 2.25,
    waveIntervalEnd: 0.9,
    waveSizeRampSeconds: 20,
    initialMaxFruits: 3,
    maxFruitsPerWave: 8,
    speedStart: 1,
    speedEnd: 1.28,
    levelDurationSeconds: 20,
    maxLevel: 10,
  },
  spawner: {
    firstWaveDelay: 0.35,
    waveStagger: 0.065,
    maxPendingSpawns: 24,
  },
  slash: {
    trailLifetime: 0.24,
    minPointDistancePx: 2,
    maxPendingSegments: 512,
    hitRadiusScale: 1.08,
    minHitRadiusPx: 18,
  },
  camera: {
    fov: 50,
    landscapeZ: 11,
    squareZ: 11.8,
    portraitZ: 13.2,
    y: 0.45,
  },
  effects: {
    maxParticles: 260,
  },
} as const;

export function getFruitDefinition(id: FruitId): FruitDefinition {
  const definition = FRUIT_DEFINITIONS.find((fruit) => fruit.id === id);
  if (!definition) {
    throw new Error(`Unknown fruit id: ${id}`);
  }
  return definition;
}

export function getInitialFruitIds(): FruitId[] {
  return FRUIT_DEFINITIONS.filter((fruit) => fruit.unlockAtSeconds === 0).map(
    (fruit) => fruit.id,
  );
}
