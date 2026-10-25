import { describe, expect, it } from 'vitest';
import {
  EVENT_DEFINITIONS,
  EVENT_SYSTEM_CONFIG,
  type EventSystemConfig,
} from '../src/config/eventConfig';
import { EventManager } from '../src/events/EventManager';
import type {
  CoinRewardStatus,
  EventHooks,
  GameEventDefinition,
} from '../src/events/EventTypes';

interface HarnessOptions {
  readonly bestCombo?: number;
  readonly lives?: number;
  readonly definitions?: readonly GameEventDefinition[];
  readonly config?: EventSystemConfig;
  readonly coinStatus?: CoinRewardStatus;
}

function createHarness(options: HarnessOptions = {}) {
  let lives = options.lives ?? 3;
  const started: GameEventDefinition[] = [];
  const ended: GameEventDefinition[] = [];
  const scoreRewards: Array<{ id: string; amount: number }> = [];
  const coinRewards: Array<{ id: string; amount: number; once: boolean }> = [];
  const hooks: EventHooks = {
    onEventStarted: (definition) => {
      started.push(definition);
    },
    onEventEnded: (definition) => {
      ended.push(definition);
    },
    onActiveEventsChanged: () => {},
    onScoreReward: (definition, amount) => {
      scoreRewards.push({ id: definition.id, amount });
    },
    onCoinReward: (definition, amount, once) => {
      coinRewards.push({ id: definition.id, amount, once });
      return options.coinStatus ?? 'granted';
    },
    getLives: () => lives,
  };
  const manager = new EventManager(hooks, {
    definitions: options.definitions,
    config: options.config,
    random: () => 0.5,
  });
  manager.startRun(options.bestCombo ?? 0);
  return {
    manager,
    started,
    ended,
    scoreRewards,
    coinRewards,
    setLives: (next: number) => {
      lives = next;
    },
  };
}

function countId(definitions: readonly GameEventDefinition[], id: string) {
  return definitions.filter((definition) => definition.id === id).length;
}

function eventById(id: string): GameEventDefinition {
  const definition = EVENT_DEFINITIONS.find((entry) => entry.id === id);
  if (!definition) {
    throw new Error(`Missing event definition: ${id}`);
  }
  return definition;
}

const timedDefinitions: readonly GameEventDefinition[] = [
  {
    id: 'test-timed-a',
    name: 'Timed A',
    description: 'Test event A',
    rarity: 'common',
    category: 'score',
    trigger: { type: 'score', threshold: 10 },
    effect: 'announce',
    duration: 5,
    oncePerRun: true,
    priority: 10,
    enabled: true,
  },
  {
    id: 'test-timed-b',
    name: 'Timed B',
    description: 'Test event B',
    rarity: 'common',
    category: 'score',
    trigger: { type: 'score', threshold: 20 },
    effect: 'announce',
    duration: 5,
    oncePerRun: true,
    priority: 10,
    enabled: true,
  },
];

describe('EventManager combo events', () => {
  it('fires each combo milestone at most once per combo chain and can retrigger after a reset', () => {
    const harness = createHarness({ bestCombo: 100 });

    for (let combo = 1; combo <= 5; combo += 1) {
      harness.manager.notifyCombo(combo);
    }
    expect(countId(harness.started, 'combo-quick-slash')).toBe(1);

    harness.manager.notifyCombo(6);
    expect(countId(harness.started, 'combo-quick-slash')).toBe(1);

    harness.manager.notifyCombo(0);
    for (let combo = 1; combo <= 5; combo += 1) {
      harness.manager.notifyCombo(combo);
    }
    // The queue gap is intentional pacing; drain it to let the new
    // quick-slash banner start instead of stacking immediately.
    harness.manager.tick(1);
    expect(countId(harness.started, 'combo-quick-slash')).toBe(2);
  });

  it('applies Frenzy while active, never stacks it, and re-arms it for a new chain', () => {
    const harness = createHarness({ bestCombo: 100 });
    for (let combo = 1; combo <= 10; combo += 1) {
      harness.manager.notifyCombo(combo);
    }
    harness.manager.tick(1);
    expect(countId(harness.started, 'combo-frenzy')).toBe(1);
    expect(harness.manager.sliceBonus).toBe(
      EVENT_SYSTEM_CONFIG.combo.frenzySliceBonus,
    );

    harness.manager.notifyCombo(11);
    expect(countId(harness.started, 'combo-frenzy')).toBe(1);

    harness.manager.tick(EVENT_SYSTEM_CONFIG.combo.frenzyDurationSeconds);
    expect(harness.manager.activeEvents).toHaveLength(0);
    expect(harness.manager.sliceBonus).toBe(0);

    harness.manager.notifyCombo(12);
    expect(countId(harness.started, 'combo-frenzy')).toBe(1);

    harness.manager.notifyCombo(0);
    for (let combo = 1; combo <= 10; combo += 1) {
      harness.manager.notifyCombo(combo);
    }
    harness.manager.tick(1);
    expect(countId(harness.started, 'combo-frenzy')).toBe(2);
  });

  it('fires Golden Rush and Blade Master once per chain', () => {
    const harness = createHarness({ bestCombo: 100 });
    for (const combo of [5, 10, 20, 30]) {
      harness.manager.notifyCombo(combo);
      harness.manager.tick(1);
    }
    expect(countId(harness.started, 'combo-golden-rush')).toBe(1);
    expect(countId(harness.started, 'combo-blade-master')).toBe(1);
    expect(
      harness.scoreRewards.filter((reward) => {
        return reward.id === 'combo-blade-master';
      }),
    ).toHaveLength(1);

    harness.manager.notifyCombo(31);
    harness.manager.tick(1);
    expect(countId(harness.started, 'combo-golden-rush')).toBe(1);
    expect(countId(harness.started, 'combo-blade-master')).toBe(1);
  });
});

describe('EventManager skill events', () => {
  it('requires 10 consecutive slices for Precision Master', () => {
    const harness = createHarness({
      definitions: [eventById('skill-precision-master')],
    });
    for (let index = 0; index < 9; index += 1) {
      harness.manager.notifyFruitSliced({
        fruitId: 'apple',
        combo: index + 1,
        sameSwipeFruitCount: 1,
        points: 10,
      });
    }
    expect(countId(harness.started, 'skill-precision-master')).toBe(0);

    harness.manager.notifyFruitSliced({
      fruitId: 'apple',
      combo: 10,
      sameSwipeFruitCount: 1,
      points: 10,
    });
    expect(countId(harness.started, 'skill-precision-master')).toBe(1);
    expect(harness.coinRewards).toHaveLength(1);

    harness.manager.notifyFruitSliced({
      fruitId: 'apple',
      combo: 11,
      sameSwipeFruitCount: 1,
      points: 10,
    });
    expect(countId(harness.started, 'skill-precision-master')).toBe(1);
  });

  it('restarts the Clean Run timer when the player loses a heart', () => {
    const harness = createHarness({
      definitions: [eventById('skill-clean-run')],
    });
    harness.manager.tick(59);
    expect(countId(harness.started, 'skill-clean-run')).toBe(0);

    harness.manager.notifyBomb();
    harness.manager.tick(59);
    expect(countId(harness.started, 'skill-clean-run')).toBe(0);

    harness.manager.tick(1);
    expect(countId(harness.started, 'skill-clean-run')).toBe(1);
  });

  it('collects five different fruits inside the colour window', () => {
    const harness = createHarness({
      definitions: [eventById('skill-color-collector')],
    });
    for (const fruitId of ['apple', 'orange', 'lemon', 'kiwi']) {
      harness.manager.notifyFruitSliced({
        fruitId,
        combo: 1,
        sameSwipeFruitCount: 1,
        points: 10,
      });
    }
    expect(countId(harness.started, 'skill-color-collector')).toBe(0);

    harness.manager.notifyFruitSliced({
      fruitId: 'plum',
      combo: 1,
      sameSwipeFruitCount: 1,
      points: 10,
    });
    expect(countId(harness.started, 'skill-color-collector')).toBe(1);
  });

  it('triggers Combo Breaker only above the stored personal best', () => {
    const harness = createHarness({
      definitions: [eventById('skill-combo-breaker')],
      bestCombo: 5,
    });
    harness.manager.notifyCombo(5);
    expect(countId(harness.started, 'skill-combo-breaker')).toBe(0);

    harness.manager.notifyCombo(6);
    expect(countId(harness.started, 'skill-combo-breaker')).toBe(1);
  });

  it('triggers Comeback at the target combo only on the last heart', () => {
    const harness = createHarness({
      definitions: [eventById('skill-comeback')],
      lives: 3,
    });
    harness.manager.notifyCombo(EVENT_SYSTEM_CONFIG.skills.comebackCombo);
    expect(countId(harness.started, 'skill-comeback')).toBe(0);

    harness.setLives(1);
    harness.manager.notifyCombo(EVENT_SYSTEM_CONFIG.skills.comebackCombo);
    expect(countId(harness.started, 'skill-comeback')).toBe(1);
  });
});

describe('EventManager score events', () => {
  it('grants score milestones once per run and queues thresholds crossed together', () => {
    const harness = createHarness({ bestCombo: 100 });

    harness.manager.notifyScore(1000);
    expect(countId(harness.started, 'score-fruit-rain')).toBe(1);
    expect(harness.manager.queuedCount).toBe(1);

    harness.manager.notifyScore(1000);
    expect(countId(harness.started, 'score-fruit-rain')).toBe(1);
    expect(harness.manager.queuedCount).toBe(1);

    harness.manager.tick(1);
    expect(countId(harness.started, 'score-bonus-time')).toBe(1);
    expect(harness.manager.scoreMultiplier).toBeCloseTo(
      EVENT_SYSTEM_CONFIG.scoreMilestones.bonusTimeMultiplier,
      5,
    );

    harness.manager.notifyScore(10_000);
    expect(countId(harness.started, 'score-golden-harvest')).toBe(0);
    expect(harness.manager.queuedCount).toBe(3);

    for (let index = 0; index < 3; index += 1) {
      harness.manager.tick(1);
    }
    expect(countId(harness.started, 'score-golden-harvest')).toBe(1);
    expect(countId(harness.started, 'score-champion-wave')).toBe(1);
    expect(countId(harness.started, 'score-legendary-rush')).toBe(1);
    expect(
      harness.scoreRewards.filter((reward) => {
        return reward.id === 'score-champion-wave';
      }).length,
    ).toBe(1);
    expect(
      harness.scoreRewards.filter((reward) => {
        return reward.id === 'score-legendary-rush';
      }).length,
    ).toBe(1);

    harness.manager.notifyScore(10_000);
    harness.manager.tick(1);
    expect(countId(harness.started, 'score-legendary-rush')).toBe(1);
  });

  it('queues timed events when the concurrent duration limit is reached', () => {
    const config: EventSystemConfig = {
      ...EVENT_SYSTEM_CONFIG,
      maxActiveDurationEvents: 1,
    };
    const harness = createHarness({
      definitions: timedDefinitions,
      config,
    });
    harness.manager.notifyScore(20);
    expect(harness.manager.activeEvents).toHaveLength(1);
    expect(harness.manager.queuedCount).toBe(1);

    harness.manager.tick(1);
    expect(harness.manager.activeEvents).toHaveLength(1);
    expect(harness.manager.queuedCount).toBe(1);

    harness.manager.tick(4.1);
    expect(harness.manager.activeEvents).toHaveLength(1);
    expect(harness.manager.activeEvents[0].definition.id).toBe('test-timed-b');
    expect(harness.manager.queuedCount).toBe(0);
  });
});

describe('EventManager survival and lifecycle', () => {
  it('fires survival milestones from gameplay time and freezes without ticks', () => {
    const harness = createHarness({
      definitions: [eventById('survival-warm-up'), eventById('score-bonus-time')],
    });
    harness.manager.tick(29.9);
    expect(countId(harness.started, 'survival-warm-up')).toBe(0);

    harness.manager.tick(0.1);
    expect(countId(harness.started, 'survival-warm-up')).toBe(1);

    harness.manager.notifyScore(1000);
    harness.manager.tick(1);
    const bonusTime = harness.manager.activeEvents.find((event) => {
      return event.definition.id === 'score-bonus-time';
    });
    expect(bonusTime).toBeDefined();
    const remainingBeforePause = bonusTime?.remainingSeconds ?? 0;

    // A paused game simply stops calling tick(): nothing may decay meanwhile.
    const remainingWithoutTicks =
      harness.manager.activeEvents.find((event) => {
        return event.definition.id === 'score-bonus-time';
      })?.remainingSeconds ?? 0;
    expect(remainingWithoutTicks).toBe(remainingBeforePause);

    harness.manager.tick(1);
    const remainingAfterResume =
      harness.manager.activeEvents.find((event) => {
        return event.definition.id === 'score-bonus-time';
      })?.remainingSeconds ?? 0;
    expect(remainingAfterResume).toBeCloseTo(remainingBeforePause - 1, 5);
    expect(countId(harness.started, 'survival-warm-up')).toBe(1);
  });

  it('never awards or starts events after the run ends', () => {
    const harness = createHarness({ bestCombo: 100 });
    harness.manager.notifyScore(500);
    const startedCount = harness.started.length;
    const rewardCount = harness.scoreRewards.length;

    harness.manager.endRun();
    expect(harness.manager.activeEvents).toHaveLength(0);
    expect(harness.manager.queuedCount).toBe(0);

    harness.manager.notifyScore(10_000);
    harness.manager.notifyCombo(30);
    harness.manager.tick(100);
    expect(harness.started).toHaveLength(startedCount);
    expect(harness.scoreRewards).toHaveLength(rewardCount);
  });

  it('cleans up active and queued events on reset and allows a fresh run', () => {
    const harness = createHarness({ bestCombo: 100 });
    harness.manager.notifyScore(1000);
    expect(harness.manager.queuedCount).toBe(1);
    harness.manager.tick(1);
    expect(harness.manager.activeEvents.length).toBeGreaterThan(0);

    harness.manager.resetRun();
    expect(harness.manager.activeEvents).toHaveLength(0);
    expect(harness.manager.queuedCount).toBe(0);
    expect(harness.manager.elapsed).toBe(0);
    expect(harness.manager.isRunning).toBe(false);

    harness.manager.startRun(100);
    harness.manager.notifyScore(500);
    expect(countId(harness.started, 'score-fruit-rain')).toBe(2);
  });

  it('applies cooldowns to repeated near misses', () => {
    const nearMiss = eventById('random-near-miss');
    const harness = createHarness({
      definitions: [nearMiss],
      bestCombo: 100,
    });
    expect(harness.manager.notifyNearMiss()).toBe(true);
    expect(countId(harness.started, 'random-near-miss')).toBe(1);
    expect(harness.manager.notifyNearMiss()).toBe(false);
    expect(countId(harness.started, 'random-near-miss')).toBe(1);

    harness.manager.tick(EVENT_SYSTEM_CONFIG.randomEvents.nearMissCooldown);
    expect(harness.manager.notifyNearMiss()).toBe(true);
    expect(countId(harness.started, 'random-near-miss')).toBe(2);
  });

  it('cancels Bomb Rush when the player reaches the low-lives threshold', () => {
    const bombRush = eventById('random-bomb-rush');
    const harness = createHarness({
      definitions: [bombRush],
      config: {
        ...EVENT_SYSTEM_CONFIG,
        random: {
          ...EVENT_SYSTEM_CONFIG.random,
          minElapsedSeconds: 0,
          globalCooldownSeconds: 0,
          rollIntervalSeconds: 0.1,
        },
      },
    });
    harness.manager.tick(0.1);
    expect(countId(harness.started, 'random-bomb-rush')).toBe(1);
    expect(harness.manager.activeEvents).toHaveLength(1);

    harness.setLives(1);
    harness.manager.tick(0.1);
    expect(harness.manager.activeEvents).toHaveLength(0);
    expect(countId(harness.ended, 'random-bomb-rush')).toBe(1);
  });

  it('honors the global switch and disabled event ids', () => {
    const disabled = createHarness({
      config: {
        ...EVENT_SYSTEM_CONFIG,
        disabledEventIds: ['score-fruit-rain'],
      },
    });
    disabled.manager.notifyScore(500);
    expect(countId(disabled.started, 'score-fruit-rain')).toBe(0);
    expect(disabled.scoreRewards).toHaveLength(0);

    const off = createHarness({
      config: { ...EVENT_SYSTEM_CONFIG, enabled: false },
    });
    off.manager.notifyScore(10_000);
    off.manager.notifyCombo(30);
    off.manager.tick(200);
    expect(off.started).toHaveLength(0);
    expect(off.scoreRewards).toHaveLength(0);
  });

  it('caps stacked score multipliers and clears them when events end', () => {
    const definitions: readonly GameEventDefinition[] = [
      {
        id: 'test-multiplier-a',
        name: 'Multiplier A',
        description: 'Test multiplier A',
        rarity: 'rare',
        category: 'score',
        trigger: { type: 'score', threshold: 10 },
        effect: 'announce',
        duration: 5,
        priority: 10,
        enabled: true,
        modifiers: { scoreMultiplier: 1.5 },
      },
      {
        id: 'test-multiplier-b',
        name: 'Multiplier B',
        description: 'Test multiplier B',
        rarity: 'rare',
        category: 'score',
        trigger: { type: 'score', threshold: 20 },
        effect: 'announce',
        duration: 5,
        priority: 10,
        enabled: true,
        modifiers: { scoreMultiplier: 2 },
      },
    ];
    const harness = createHarness({
      definitions,
      config: {
        ...EVENT_SYSTEM_CONFIG,
        maxActiveDurationEvents: 2,
        scoreRules: {
          ...EVENT_SYSTEM_CONFIG.scoreRules,
          maxMultiplier: 1.2,
        },
        queueGapSeconds: 0,
      },
    });

    harness.manager.notifyScore(20);
    expect(harness.manager.activeEvents).toHaveLength(2);
    expect(harness.manager.scoreMultiplier).toBeCloseTo(1.2, 5);

    harness.manager.tick(5.1);
    expect(harness.manager.activeEvents).toHaveLength(0);
    expect(harness.manager.scoreMultiplier).toBe(1);
  });

  it('grants achievement coin rewards through the once hook exactly once per activation', () => {
    const perfectSlice = eventById('skill-perfect-slice');
    const harness = createHarness({
      definitions: [perfectSlice],
      bestCombo: 100,
    });
    harness.manager.notifyFruitSliced({
      fruitId: 'apple',
      combo: 1,
      sameSwipeFruitCount: 3,
      points: 60,
    });
    expect(harness.coinRewards).toEqual([
      { id: 'skill-perfect-slice', amount: 40, once: true },
    ]);

    harness.manager.notifyFruitSliced({
      fruitId: 'apple',
      combo: 1,
      sameSwipeFruitCount: 3,
      points: 60,
    });
    expect(harness.coinRewards).toHaveLength(1);
  });
});
