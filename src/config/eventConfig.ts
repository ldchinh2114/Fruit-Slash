import type {
  EventRarity,
  GameEventDefinition,
} from '../events/EventTypes';

export interface EventSystemConfig {
  readonly enabled: boolean;
  readonly disabledEventIds: readonly string[];
  readonly maxActiveDurationEvents: number;
  readonly maxQueuedEvents: number;
  readonly queueGapSeconds: number;
  readonly random: {
    readonly rollIntervalSeconds: number;
    readonly globalCooldownSeconds: number;
    readonly minElapsedSeconds: number;
    readonly lowLivesThreshold: number;
    readonly rarityWeights: Readonly<Record<EventRarity, number>>;
    readonly lowLivesBlockedEventIds: readonly string[];
  };
  readonly limits: {
    readonly maxActiveEntities: number;
    readonly maxActiveBombs: number;
    readonly maxFruitsPerBurst: number;
    readonly maxBombsPerBurst: number;
    readonly fruitBurstStaggerSeconds: number;
    readonly bombBurstStaggerSeconds: number;
  };
  readonly scoreRules: {
    readonly maxMultiplier: number;
    readonly minMotionScale: number;
  };
  readonly banner: {
    readonly visibleSeconds: number;
  };
  readonly combo: {
    readonly quickSlashThreshold: number;
    readonly frenzyThreshold: number;
    readonly goldenRushThreshold: number;
    readonly bladeMasterThreshold: number;
    readonly frenzyDurationSeconds: number;
    readonly bladeMasterDurationSeconds: number;
    readonly quickSlashRewardScore: number;
    readonly frenzySliceBonus: number;
    readonly bladeMasterSliceBonus: number;
    readonly bladeMasterRewardScore: number;
  };
  readonly scoreMilestones: {
    readonly fruitRain: number;
    readonly fruitRainCount: number;
    readonly bonusTime: number;
    readonly bonusTimeDurationSeconds: number;
    readonly bonusTimeMultiplier: number;
    readonly goldenHarvest: number;
    readonly goldenHarvestCount: number;
    readonly championWave: number;
    readonly championWaveFruitCount: number;
    readonly championWaveBombCount: number;
    readonly championWaveRewardScore: number;
    readonly legendaryRush: number;
    readonly legendaryRushDurationSeconds: number;
    readonly legendaryRushMultiplier: number;
    readonly legendaryRushRewardScore: number;
    readonly legendaryRushRewardCoins: number;
  };
  readonly survival: {
    readonly warmUpSeconds: number;
    readonly challengeSeconds: number;
    readonly dangerSeconds: number;
    readonly legendSeconds: number;
    readonly cleanRunSeconds: number;
    readonly warmUpRewardScore: number;
    readonly challengeFruitCount: number;
    readonly challengeRewardScore: number;
    readonly dangerFruitCount: number;
    readonly dangerBombCount: number;
    readonly dangerRewardScore: number;
    readonly legendRewardScore: number;
    readonly legendRewardCoins: number;
  };
  readonly skills: {
    readonly perfectSliceCount: number;
    readonly fruitMasterCount: number;
    readonly precisionMasterCount: number;
    readonly colorCollectorCount: number;
    readonly colorCollectorWindowSeconds: number;
    readonly comebackCombo: number;
    readonly comboBreakerMinCombo: number;
  };
  readonly randomEvents: {
    readonly goldenFruitCooldown: number;
    readonly slowMotionDurationSeconds: number;
    readonly slowMotionScale: number;
    readonly slowMotionCooldown: number;
    readonly fruitStormCount: number;
    readonly fruitStormCooldown: number;
    readonly bombRushBombCount: number;
    readonly bombRushWarningSeconds: number;
    readonly bombRushDurationSeconds: number;
    readonly bombRushCooldown: number;
    readonly rainbowFruitCooldown: number;
    readonly nearMissCooldown: number;
    readonly nearMissMarginPx: number;
    readonly nearMissRewardScore: number;
  };
  readonly specialFruit: {
    readonly goldenScoreMultiplier: number;
    readonly rainbowScoreMultiplier: number;
    readonly goldenLifetimeSeconds: number;
    readonly rainbowLifetimeSeconds: number;
  };
}

export const EVENT_SYSTEM_CONFIG: EventSystemConfig = {
  enabled: true,
  disabledEventIds: [],
  maxActiveDurationEvents: 2,
  maxQueuedEvents: 8,
  queueGapSeconds: 0.75,
  random: {
    rollIntervalSeconds: 8,
    globalCooldownSeconds: 10,
    minElapsedSeconds: 10,
    lowLivesThreshold: 1,
    rarityWeights: {
      common: 62,
      uncommon: 26,
      rare: 9,
      epic: 3,
      legendary: 0.6,
    },
    lowLivesBlockedEventIds: ['random-bomb-rush'],
  },
  limits: {
    maxActiveEntities: 18,
    maxActiveBombs: 4,
    maxFruitsPerBurst: 8,
    maxBombsPerBurst: 3,
    fruitBurstStaggerSeconds: 0.07,
    bombBurstStaggerSeconds: 0.24,
  },
  scoreRules: {
    maxMultiplier: 4,
    minMotionScale: 0.45,
  },
  banner: {
    visibleSeconds: 3.4,
  },
  combo: {
    quickSlashThreshold: 5,
    frenzyThreshold: 10,
    goldenRushThreshold: 20,
    bladeMasterThreshold: 30,
    frenzyDurationSeconds: 5,
    bladeMasterDurationSeconds: 6,
    quickSlashRewardScore: 15,
    frenzySliceBonus: 8,
    bladeMasterSliceBonus: 15,
    bladeMasterRewardScore: 100,
  },
  scoreMilestones: {
    fruitRain: 500,
    fruitRainCount: 5,
    bonusTime: 1000,
    bonusTimeDurationSeconds: 5,
    bonusTimeMultiplier: 1.5,
    goldenHarvest: 2500,
    goldenHarvestCount: 3,
    championWave: 5000,
    championWaveFruitCount: 8,
    championWaveBombCount: 2,
    championWaveRewardScore: 100,
    legendaryRush: 10_000,
    legendaryRushDurationSeconds: 8,
    legendaryRushMultiplier: 1.25,
    legendaryRushRewardScore: 200,
    legendaryRushRewardCoins: 100,
  },
  survival: {
    warmUpSeconds: 30,
    challengeSeconds: 60,
    dangerSeconds: 120,
    legendSeconds: 180,
    cleanRunSeconds: 60,
    warmUpRewardScore: 20,
    challengeFruitCount: 5,
    challengeRewardScore: 40,
    dangerFruitCount: 8,
    dangerBombCount: 1,
    dangerRewardScore: 75,
    legendRewardScore: 200,
    legendRewardCoins: 50,
  },
  skills: {
    perfectSliceCount: 3,
    fruitMasterCount: 20,
    precisionMasterCount: 10,
    colorCollectorCount: 5,
    colorCollectorWindowSeconds: 10,
    comebackCombo: 15,
    comboBreakerMinCombo: 5,
  },
  randomEvents: {
    goldenFruitCooldown: 32,
    slowMotionDurationSeconds: 4,
    slowMotionScale: 0.55,
    slowMotionCooldown: 30,
    fruitStormCount: 8,
    fruitStormCooldown: 26,
    bombRushBombCount: 3,
    bombRushWarningSeconds: 2,
    bombRushDurationSeconds: 6,
    bombRushCooldown: 45,
    rainbowFruitCooldown: 40,
    nearMissCooldown: 18,
    nearMissMarginPx: 26,
    nearMissRewardScore: 25,
  },
  specialFruit: {
    goldenScoreMultiplier: 4,
    rainbowScoreMultiplier: 6,
    goldenLifetimeSeconds: 7,
    rainbowLifetimeSeconds: 8,
  },
};

const {
  combo,
  scoreMilestones,
  survival,
  skills,
  randomEvents,
  specialFruit,
} = EVENT_SYSTEM_CONFIG;

export const EVENT_DEFINITIONS: readonly GameEventDefinition[] = [
  {
    id: 'combo-quick-slash',
    name: 'Quick Slash',
    description: 'Combo x5! Giữ nhịp chém và nhận điểm thưởng nhanh.',
    rarity: 'common',
    category: 'combo',
    trigger: { type: 'combo', threshold: combo.quickSlashThreshold },
    effect: 'announce',
    priority: 20,
    enabled: true,
    reward: { score: combo.quickSlashRewardScore },
    visual: { color: 0x7ee8fa, celebrate: true },
    tags: ['combo'],
  },
  {
    id: 'combo-frenzy',
    name: 'Frenzy',
    description: 'Đường chém phát sáng và mọi nhát chém thêm điểm trong 5 giây.',
    rarity: 'rare',
    category: 'combo',
    trigger: { type: 'combo', threshold: combo.frenzyThreshold },
    effect: 'overlay',
    duration: combo.frenzyDurationSeconds,
    priority: 50,
    enabled: true,
    modifiers: { sliceBonus: combo.frenzySliceBonus },
    visual: {
      color: 0xff4fd8,
      slashCore: 0xffffff,
      slashEdge: 0xff4fd8,
      celebrate: true,
    },
    tags: ['combo'],
  },
  {
    id: 'combo-golden-rush',
    name: 'Golden Rush',
    description: 'Một đợt trái cây vàng xuất hiện! Chém trúng để nhận điểm lớn.',
    rarity: 'epic',
    category: 'combo',
    trigger: { type: 'combo', threshold: combo.goldenRushThreshold },
    effect: 'special-fruit',
    priority: 60,
    enabled: true,
    spawn: {
      specialFruit: 'golden',
      specialFruitCount: 3,
      specialScoreMultiplier: specialFruit.goldenScoreMultiplier,
      specialLifetime: specialFruit.goldenLifetimeSeconds,
    },
    visual: { color: 0xffd166, celebrate: true },
    tags: ['combo'],
  },
  {
    id: 'combo-blade-master',
    name: 'Blade Master',
    description: 'Danh hiệu Blade Master! Hiệu ứng chém đặc biệt trong 6 giây.',
    rarity: 'legendary',
    category: 'combo',
    trigger: { type: 'combo', threshold: combo.bladeMasterThreshold },
    effect: 'overlay',
    duration: combo.bladeMasterDurationSeconds,
    priority: 80,
    enabled: true,
    reward: { score: combo.bladeMasterRewardScore },
    modifiers: { sliceBonus: combo.bladeMasterSliceBonus },
    visual: {
      color: 0xffe28a,
      slashCore: 0xfff6cf,
      slashEdge: 0xffa63d,
      celebrate: true,
    },
    tags: ['combo'],
  },
  {
    id: 'score-fruit-rain',
    name: 'Fruit Rain',
    description: 'Một đợt trái cây bổ sung đổ xuống sân chơi.',
    rarity: 'common',
    category: 'score',
    trigger: { type: 'score', threshold: scoreMilestones.fruitRain },
    effect: 'fruit-burst',
    oncePerRun: true,
    priority: 25,
    enabled: true,
    spawn: { fruitCount: scoreMilestones.fruitRainCount },
    visual: { color: 0x9ef7b8, celebrate: true },
  },
  {
    id: 'score-bonus-time',
    name: 'Bonus Time',
    description: 'Nhân 1,5 điểm cho mọi nhát chém trong 5 giây.',
    rarity: 'rare',
    category: 'score',
    trigger: { type: 'score', threshold: scoreMilestones.bonusTime },
    effect: 'announce',
    duration: scoreMilestones.bonusTimeDurationSeconds,
    oncePerRun: true,
    priority: 45,
    enabled: true,
    modifiers: { scoreMultiplier: scoreMilestones.bonusTimeMultiplier },
    visual: { color: 0xffd166, celebrate: true },
  },
  {
    id: 'score-golden-harvest',
    name: 'Golden Harvest',
    description: 'Nhóm trái cây vàng xuất hiện. Cơ hội ghi điểm cực lớn!',
    rarity: 'epic',
    category: 'score',
    trigger: { type: 'score', threshold: scoreMilestones.goldenHarvest },
    effect: 'special-fruit',
    oncePerRun: true,
    priority: 55,
    enabled: true,
    spawn: {
      specialFruit: 'golden',
      specialFruitCount: scoreMilestones.goldenHarvestCount,
      specialScoreMultiplier: specialFruit.goldenScoreMultiplier,
      specialLifetime: specialFruit.goldenLifetimeSeconds,
    },
    visual: { color: 0xffc93c, celebrate: true },
  },
  {
    id: 'score-champion-wave',
    name: 'Champion Wave',
    description: 'Đợt thử thách đặc biệt: trái cây dày hơn và có bom hộ tống.',
    rarity: 'epic',
    category: 'score',
    trigger: { type: 'score', threshold: scoreMilestones.championWave },
    effect: 'fruit-burst',
    oncePerRun: true,
    priority: 70,
    enabled: true,
    reward: { score: scoreMilestones.championWaveRewardScore },
    spawn: {
      fruitCount: scoreMilestones.championWaveFruitCount,
      bombCount: scoreMilestones.championWaveBombCount,
      warningSeconds: 1.2,
    },
    visual: { color: 0xff9f43, celebrate: true },
  },
  {
    id: 'score-legendary-rush',
    name: 'Legendary Rush',
    description: 'Khoảnh khắc huyền thoại! Điểm thưởng và hào quang rực rỡ.',
    rarity: 'legendary',
    category: 'score',
    trigger: { type: 'score', threshold: scoreMilestones.legendaryRush },
    effect: 'celebrate',
    duration: scoreMilestones.legendaryRushDurationSeconds,
    oncePerRun: true,
    priority: 95,
    enabled: true,
    reward: {
      score: scoreMilestones.legendaryRushRewardScore,
      coins: scoreMilestones.legendaryRushRewardCoins,
    },
    modifiers: { scoreMultiplier: scoreMilestones.legendaryRushMultiplier },
    visual: {
      color: 0xffe28a,
      slashCore: 0xfff8d9,
      slashEdge: 0xff6b6b,
      celebrate: true,
    },
  },
  {
    id: 'random-golden-fruit',
    name: 'Golden Fruit',
    description: 'Một quả vàng giá trị cao xuất hiện trong thời gian ngắn.',
    rarity: 'uncommon',
    category: 'random',
    trigger: { type: 'random', weight: 1, minInterval: 32 },
    effect: 'special-fruit',
    cooldown: randomEvents.goldenFruitCooldown,
    priority: 30,
    enabled: true,
    spawn: {
      specialFruit: 'golden',
      specialFruitCount: 1,
      specialScoreMultiplier: specialFruit.goldenScoreMultiplier,
      specialLifetime: specialFruit.goldenLifetimeSeconds,
    },
    visual: { color: 0xffd166, celebrate: true },
    tags: ['bonus-fruit'],
  },
  {
    id: 'random-slow-motion',
    name: 'Slow Motion',
    description: 'Trái cây bay chậm lại trong 4 giây. Thời gian vẫn chạy thật.',
    rarity: 'common',
    category: 'random',
    trigger: { type: 'random', weight: 1, minInterval: 30 },
    effect: 'announce',
    duration: randomEvents.slowMotionDurationSeconds,
    cooldown: randomEvents.slowMotionCooldown,
    priority: 40,
    enabled: true,
    modifiers: { motionScale: randomEvents.slowMotionScale },
    visual: { color: 0x8fd6ff, celebrate: true },
    tags: ['time-scale'],
  },
  {
    id: 'random-fruit-storm',
    name: 'Fruit Storm',
    description: 'Một cơn bão trái cây ập xuống cùng lúc.',
    rarity: 'common',
    category: 'random',
    trigger: { type: 'random', weight: 1, minInterval: 26 },
    effect: 'fruit-burst',
    cooldown: randomEvents.fruitStormCooldown,
    priority: 35,
    enabled: true,
    spawn: { fruitCount: randomEvents.fruitStormCount },
    visual: { color: 0x7ef0a5, celebrate: true },
    tags: ['spawn-burst'],
  },
  {
    id: 'random-bomb-rush',
    name: 'Bomb Rush',
    description: 'Cảnh báo bom tăng cường! Né ngay khi có thể.',
    rarity: 'rare',
    category: 'random',
    trigger: { type: 'random', weight: 1, minInterval: 45 },
    effect: 'bomb-burst',
    duration: randomEvents.bombRushDurationSeconds,
    cooldown: randomEvents.bombRushCooldown,
    priority: 75,
    enabled: true,
    spawn: {
      bombCount: randomEvents.bombRushBombCount,
      warningSeconds: randomEvents.bombRushWarningSeconds,
    },
    visual: { color: 0xff6b6b, celebrate: false },
    tags: ['spawn-burst', 'hazard'],
  },
  {
    id: 'random-rainbow-fruit',
    name: 'Rainbow Fruit',
    description: 'Trái cây cầu vồng xuất hiện với điểm thưởng đặc biệt.',
    rarity: 'rare',
    category: 'random',
    trigger: { type: 'random', weight: 1, minInterval: 40 },
    effect: 'special-fruit',
    cooldown: randomEvents.rainbowFruitCooldown,
    priority: 65,
    enabled: true,
    spawn: {
      specialFruit: 'rainbow',
      specialFruitCount: 1,
      specialScoreMultiplier: specialFruit.rainbowScoreMultiplier,
      specialLifetime: specialFruit.rainbowLifetimeSeconds,
    },
    visual: { color: 0xff6bd6, celebrate: true },
    tags: ['bonus-fruit'],
  },
  {
    id: 'random-near-miss',
    name: 'Near Miss',
    description: 'Suýt trúng bom! Một pha né đẹp và không mất tim.',
    rarity: 'uncommon',
    category: 'random',
    trigger: { type: 'nearMiss' },
    effect: 'celebrate',
    cooldown: randomEvents.nearMissCooldown,
    priority: 22,
    enabled: true,
    reward: { score: randomEvents.nearMissRewardScore },
    visual: { color: 0x7ee8fa, celebrate: true },
  },
  {
    id: 'skill-perfect-slice',
    name: 'Perfect Slice',
    description: 'Ba trái cây trong cùng một đường chém. Quá chuẩn!',
    rarity: 'rare',
    category: 'achievement',
    trigger: {
      type: 'skill',
      condition: 'perfect-slice',
      threshold: skills.perfectSliceCount,
    },
    effect: 'celebrate',
    oncePerRun: true,
    priority: 55,
    enabled: true,
    reward: { score: 30, coins: 40, coinsOnce: true },
    visual: { color: 0x7ee8fa, celebrate: true },
  },
  {
    id: 'skill-fruit-master',
    name: 'Fruit Master',
    description: 'Chém trúng 20 trái cây mà không bỏ lỡ.',
    rarity: 'epic',
    category: 'achievement',
    trigger: {
      type: 'skill',
      condition: 'fruit-master',
      threshold: skills.fruitMasterCount,
    },
    effect: 'celebrate',
    oncePerRun: true,
    priority: 60,
    enabled: true,
    reward: { score: 100, coins: 100, coinsOnce: true },
    visual: { color: 0x9dff8f, celebrate: true },
  },
  {
    id: 'skill-clean-run',
    name: 'Clean Run',
    description: 'Sống sót 60 giây liên tiếp mà không mất trái tim.',
    rarity: 'epic',
    category: 'achievement',
    trigger: {
      type: 'skill',
      condition: 'clean-run',
      threshold: survival.cleanRunSeconds,
    },
    effect: 'celebrate',
    oncePerRun: true,
    priority: 60,
    enabled: true,
    reward: { score: 80, coins: 75, coinsOnce: true },
    visual: { color: 0x7ef0a5, celebrate: true },
  },
  {
    id: 'skill-comeback',
    name: 'Comeback',
    description: 'Đạt combo mục tiêu khi chỉ còn một trái tim.',
    rarity: 'rare',
    category: 'achievement',
    trigger: {
      type: 'skill',
      condition: 'comeback',
      threshold: skills.comebackCombo,
    },
    effect: 'celebrate',
    oncePerRun: true,
    priority: 55,
    enabled: true,
    reward: { score: 60, coins: 60, coinsOnce: true },
    visual: { color: 0xff8fb1, celebrate: true },
  },
  {
    id: 'skill-combo-breaker',
    name: 'Combo Breaker',
    description: 'Phá kỷ lục combo cá nhân của bạn.',
    rarity: 'epic',
    category: 'achievement',
    trigger: { type: 'skill', condition: 'combo-breaker' },
    effect: 'celebrate',
    oncePerRun: true,
    priority: 65,
    enabled: true,
    reward: { score: 80, coins: 100, coinsOnce: true },
    visual: { color: 0xffc93c, celebrate: true },
  },
  {
    id: 'skill-color-collector',
    name: 'Color Collector',
    description: 'Chém trúng đủ 5 loại trái cây trong 10 giây.',
    rarity: 'rare',
    category: 'achievement',
    trigger: {
      type: 'skill',
      condition: 'color-collector',
      threshold: skills.colorCollectorCount,
      windowSeconds: skills.colorCollectorWindowSeconds,
    },
    effect: 'celebrate',
    oncePerRun: true,
    priority: 50,
    enabled: true,
    reward: { score: 60, coins: 75, coinsOnce: true },
    visual: { color: 0xffa6f2, celebrate: true },
  },
  {
    id: 'skill-precision-master',
    name: 'Precision Master',
    description: 'Chém trúng 10 trái cây liên tiếp mà không bỏ lỡ.',
    rarity: 'uncommon',
    category: 'achievement',
    trigger: {
      type: 'skill',
      condition: 'precision-master',
      threshold: skills.precisionMasterCount,
    },
    effect: 'celebrate',
    oncePerRun: true,
    priority: 45,
    enabled: true,
    reward: { score: 40, coins: 50, coinsOnce: true },
    visual: { color: 0x7ee8fa, celebrate: true },
  },
  {
    id: 'survival-warm-up',
    name: 'Warm-up Complete',
    description: 'Bạn đã sống sót 30 giây. Khởi động hoàn tất!',
    rarity: 'common',
    category: 'survival',
    trigger: { type: 'survivalTime', seconds: survival.warmUpSeconds },
    effect: 'announce',
    oncePerRun: true,
    priority: 15,
    enabled: true,
    reward: { score: survival.warmUpRewardScore },
    visual: { color: 0x7ef0a5, celebrate: true },
  },
  {
    id: 'survival-challenge',
    name: 'Survival Challenge',
    description: 'Mốc 60 giây: một đợt trái cây thử thách xuất hiện.',
    rarity: 'uncommon',
    category: 'survival',
    trigger: { type: 'survivalTime', seconds: survival.challengeSeconds },
    effect: 'fruit-burst',
    oncePerRun: true,
    priority: 35,
    enabled: true,
    reward: { score: survival.challengeRewardScore },
    spawn: { fruitCount: survival.challengeFruitCount },
    visual: { color: 0x7ee8fa, celebrate: true },
  },
  {
    id: 'survival-danger-zone',
    name: 'Danger Zone',
    description: '120 giây! Vùng nguy hiểm bắt đầu, bom sẽ xuất hiện cùng đợt trái cây.',
    rarity: 'rare',
    category: 'survival',
    trigger: { type: 'survivalTime', seconds: survival.dangerSeconds },
    effect: 'fruit-burst',
    oncePerRun: true,
    priority: 60,
    enabled: true,
    reward: { score: survival.dangerRewardScore },
    spawn: {
      fruitCount: survival.dangerFruitCount,
      bombCount: survival.dangerBombCount,
      warningSeconds: 1.5,
    },
    visual: { color: 0xff9f43, celebrate: true },
  },
  {
    id: 'survival-legend',
    name: 'Survival Legend',
    description: '180 giây sống sót! Bạn là huyền thoại của sân chơi.',
    rarity: 'legendary',
    category: 'survival',
    trigger: { type: 'survivalTime', seconds: survival.legendSeconds },
    effect: 'celebrate',
    oncePerRun: true,
    priority: 90,
    enabled: true,
    reward: {
      score: survival.legendRewardScore,
      coins: survival.legendRewardCoins,
    },
    visual: { color: 0xffe28a, celebrate: true },
  },
];
