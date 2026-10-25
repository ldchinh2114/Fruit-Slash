import {
  EVENT_DEFINITIONS,
  EVENT_SYSTEM_CONFIG,
  type EventSystemConfig,
} from '../config/eventConfig';
import type {
  ActiveEventInfo,
  EventHooks,
  EventPresentation,
  GameEventDefinition,
  SliceEventInfo,
} from './EventTypes';

export interface EventManagerOptions {
  readonly definitions?: readonly GameEventDefinition[];
  readonly config?: EventSystemConfig;
  readonly random?: () => number;
}

interface ActiveEvent {
  readonly definition: GameEventDefinition;
  remainingSeconds: number;
  readonly durationSeconds: number;
}

interface QueuedEvent {
  readonly definition: GameEventDefinition;
}

interface RecentSlice {
  readonly fruitId: string;
  readonly at: number;
}

const SKILL_CONDITIONS = new Set<string>([
  'perfect-slice',
  'fruit-master',
  'clean-run',
  'comeback',
  'combo-breaker',
  'color-collector',
  'precision-master',
]);

/**
 * Owns every in-run event rule: trigger evaluation, pacing, cooldowns,
 * concurrency, modifiers and run lifecycle. Rendering, spawning and economy
 * live behind EventHooks so this module stays testable and DOM-free.
 */
export class EventManager {
  private readonly hooks: EventHooks;
  private readonly definitions: readonly GameEventDefinition[];
  private readonly config: EventSystemConfig;
  private readonly random: () => number;

  private readonly comboDefinitions: readonly GameEventDefinition[];
  private readonly scoreDefinitions: readonly GameEventDefinition[];
  private readonly survivalDefinitions: readonly GameEventDefinition[];
  private readonly fruitCountDefinitions: readonly GameEventDefinition[];
  private readonly skillDefinitions: readonly GameEventDefinition[];
  private readonly nearMissDefinitions: readonly GameEventDefinition[];
  private readonly randomDefinitions: readonly GameEventDefinition[];

  private active: ActiveEvent[] = [];
  private queue: QueuedEvent[] = [];
  private readonly cooldowns = new Map<string, number>();
  private readonly firedThisRun = new Set<string>();
  private readonly comboMilestonesHit = new Set<string>();

  private running = false;
  private elapsedSeconds = 0;
  private queueGapRemaining = 0;
  private currentCombo = 0;
  private bestComboThisRun = 0;
  private bestComboAtStart = 0;
  private noMissSlices = 0;
  private cleanStreakSeconds = 0;
  private recentSlices: RecentSlice[] = [];
  private nextRandomRollAt = 0;
  private nextRandomAllowedAt = 0;
  private scoreCheckDepth = 0;
  private pendingScore: number | null = null;

  constructor(hooks: EventHooks, options: EventManagerOptions = {}) {
    this.hooks = hooks;
    this.definitions = options.definitions ?? EVENT_DEFINITIONS;
    this.config = options.config ?? EVENT_SYSTEM_CONFIG;
    this.random = options.random ?? Math.random;

    const eligible = this.definitions.filter((definition) => {
      return (
        definition.enabled &&
        !this.config.disabledEventIds.includes(definition.id)
      );
    });
    this.comboDefinitions = eligible.filter((definition) => {
      return definition.trigger.type === 'combo';
    });
    this.scoreDefinitions = eligible
      .filter((definition) => definition.trigger.type === 'score')
      .sort((a, b) => getScoreThreshold(a) - getScoreThreshold(b));
    this.survivalDefinitions = eligible
      .filter((definition) => definition.trigger.type === 'survivalTime')
      .sort((a, b) => getSurvivalSeconds(a) - getSurvivalSeconds(b));
    this.fruitCountDefinitions = eligible.filter((definition) => {
      return definition.trigger.type === 'fruitSliced';
    });
    this.skillDefinitions = eligible.filter((definition) => {
      return (
        definition.trigger.type === 'skill' &&
        SKILL_CONDITIONS.has(definition.trigger.condition)
      );
    });
    this.nearMissDefinitions = eligible.filter((definition) => {
      return definition.trigger.type === 'nearMiss';
    });
    this.randomDefinitions = eligible.filter((definition) => {
      return definition.trigger.type === 'random';
    });
  }

  get isRunning(): boolean {
    return this.running;
  }

  get elapsed(): number {
    return this.elapsedSeconds;
  }

  get bestCombo(): number {
    return this.bestComboThisRun;
  }

  get activeEvents(): readonly ActiveEventInfo[] {
    return this.active.map((event) => ({
      definition: event.definition,
      remainingSeconds: Math.max(0, event.remainingSeconds),
      durationSeconds: event.durationSeconds,
    }));
  }

  get queuedCount(): number {
    return this.queue.length;
  }

  /** Multipliers are multiplied together once, then capped (see scoring rules). */
  get scoreMultiplier(): number {
    let multiplier = 1;
    for (const event of this.active) {
      const value = event.definition.modifiers?.scoreMultiplier;
      if (value && value > 0) {
        multiplier *= value;
      }
    }
    return Math.min(
      this.config.scoreRules.maxMultiplier,
      Math.max(0.01, multiplier),
    );
  }

  get sliceBonus(): number {
    let bonus = 0;
    for (const event of this.active) {
      const value = event.definition.modifiers?.sliceBonus;
      if (value && value > 0) {
        bonus += value;
      }
    }
    return bonus;
  }

  get motionScale(): number {
    let scale = 1;
    for (const event of this.active) {
      const value = event.definition.modifiers?.motionScale;
      if (value && value > 0) {
        scale *= value;
      }
    }
    return Math.max(
      this.config.scoreRules.minMotionScale,
      Math.min(1.5, scale),
    );
  }

  startRun(bestCombo = 0): void {
    this.running = false;
    this.active = [];
    this.queue = [];
    this.cooldowns.clear();
    this.firedThisRun.clear();
    this.comboMilestonesHit.clear();
    this.elapsedSeconds = 0;
    this.queueGapRemaining = 0;
    this.currentCombo = 0;
    this.bestComboThisRun = 0;
    this.bestComboAtStart = Math.max(0, Math.floor(bestCombo));
    this.noMissSlices = 0;
    this.cleanStreakSeconds = 0;
    this.recentSlices = [];
    this.scoreCheckDepth = 0;
    this.pendingScore = null;
    this.nextRandomRollAt = this.config.random.minElapsedSeconds;
    this.nextRandomAllowedAt = this.config.random.minElapsedSeconds;
    this.running = true;
    this.emitActiveEvents();
  }

  resetRun(): void {
    this.endRun();
    this.cooldowns.clear();
    this.firedThisRun.clear();
    this.comboMilestonesHit.clear();
    this.elapsedSeconds = 0;
    this.queueGapRemaining = 0;
    this.currentCombo = 0;
    this.bestComboThisRun = 0;
    this.bestComboAtStart = 0;
    this.noMissSlices = 0;
    this.cleanStreakSeconds = 0;
    this.recentSlices = [];
    this.scoreCheckDepth = 0;
    this.pendingScore = null;
  }

  endRun(): void {
    if (!this.running && this.active.length === 0) {
      return;
    }
    // Block rewards immediately: nothing may be granted after GAME_OVER.
    this.running = false;
    this.queue = [];
    if (this.active.length > 0) {
      const ended = this.active;
      this.active = [];
      for (const event of ended) {
        this.hooks.onEventEnded(event.definition);
      }
    }
    this.emitActiveEvents();
  }

  tick(deltaSeconds: number): void {
    if (!this.running || !this.config.enabled) {
      return;
    }
    const delta = Number.isFinite(deltaSeconds)
      ? Math.max(0, deltaSeconds)
      : 0;
    this.elapsedSeconds += delta;
    this.queueGapRemaining = Math.max(0, this.queueGapRemaining - delta);
    this.cleanStreakSeconds += delta;

    let endedAny = this.cancelLowLivesHazards();
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const event = this.active[index];
      event.remainingSeconds -= delta;
      if (event.remainingSeconds <= 0) {
        this.active.splice(index, 1);
        this.hooks.onEventEnded(event.definition);
        endedAny = true;
      }
    }

    this.checkSurvivalMilestones();
    this.checkTimedSkillMilestones();
    this.processQueue();
    this.tryRandomEvent();

    if (endedAny || this.active.length > 0) {
      this.emitActiveEvents();
    }
  }

  notifyScore(score: number): void {
    if (!this.running || !Number.isFinite(score)) {
      return;
    }
    const safeScore = Math.max(0, Math.floor(score));
    this.pendingScore =
      this.pendingScore === null
        ? safeScore
        : Math.max(this.pendingScore, safeScore);
    if (this.scoreCheckDepth > 0) {
      return;
    }

    this.scoreCheckDepth += 1;
    try {
      while (this.pendingScore !== null) {
        const target = this.pendingScore;
        this.pendingScore = null;
        for (const definition of this.scoreDefinitions) {
          if (target >= getScoreThreshold(definition)) {
            this.requestActivation(definition);
          }
        }
      }
    } finally {
      this.scoreCheckDepth -= 1;
    }
  }

  notifyCombo(combo: number): void {
    if (!this.running) {
      return;
    }
    const safeCombo = Math.max(0, Math.floor(combo));
    if (safeCombo <= 0) {
      this.resetComboChain();
      return;
    }
    this.currentCombo = safeCombo;
    this.bestComboThisRun = Math.max(this.bestComboThisRun, safeCombo);

    for (const definition of this.comboDefinitions) {
      if (
        safeCombo < getComboThreshold(definition) ||
        this.comboMilestonesHit.has(definition.id)
      ) {
        continue;
      }
      if (this.active.some((event) => event.definition.id === definition.id)) {
        // Consume the milestone for this chain instead of stacking a second
        // copy of the same timed modifier.
        this.comboMilestonesHit.add(definition.id);
        continue;
      }
      this.requestActivation(definition);
    }

    this.checkComboSkillMilestones();
  }

  notifyFruitSliced(info: SliceEventInfo): void {
    if (!this.running) {
      return;
    }
    this.noMissSlices += 1;
    this.recentSlices.push({ fruitId: info.fruitId, at: this.elapsedSeconds });
    this.pruneRecentSlices();

    for (const definition of this.fruitCountDefinitions) {
      if (definition.trigger.type !== 'fruitSliced') {
        continue;
      }
      if (this.noMissSlices >= definition.trigger.count) {
        this.requestActivation(definition);
      }
    }

    this.checkSliceSkillMilestones(info);
  }

  notifyMiss(): void {
    if (!this.running) {
      return;
    }
    this.resetComboChain();
    this.noMissSlices = 0;
  }

  notifyBomb(): void {
    if (!this.running) {
      return;
    }
    this.resetComboChain();
    this.noMissSlices = 0;
    this.cleanStreakSeconds = 0;
  }

  notifyNearMiss(): boolean {
    if (!this.running) {
      return false;
    }
    let activated = false;
    for (const definition of this.nearMissDefinitions) {
      if (this.requestActivation(definition)) {
        activated = true;
      }
    }
    return activated;
  }

  private resetComboChain(): void {
    this.currentCombo = 0;
    this.comboMilestonesHit.clear();
  }

  private requestActivation(definition: GameEventDefinition): boolean {
    if (!this.canFire(definition)) {
      return false;
    }

    const queued = this.shouldQueue(definition);
    if (queued && this.queue.length >= this.config.maxQueuedEvents) {
      return false;
    }

    if (definition.oncePerRun) {
      this.firedThisRun.add(definition.id);
    }
    if (definition.trigger.type === 'combo') {
      this.comboMilestonesHit.add(definition.id);
    }
    const cooldown = this.getEffectiveCooldown(definition);
    this.cooldowns.set(definition.id, this.elapsedSeconds + cooldown);

    if (queued) {
      this.queue.push({ definition });
      return true;
    }

    this.startEvent(definition);
    return true;
  }

  private canFire(definition: GameEventDefinition): boolean {
    if (!this.running || !this.config.enabled || !definition.enabled) {
      return false;
    }
    if (this.config.disabledEventIds.includes(definition.id)) {
      return false;
    }
    if (definition.oncePerRun && this.firedThisRun.has(definition.id)) {
      return false;
    }
    if (
      definition.trigger.type === 'combo' &&
      this.comboMilestonesHit.has(definition.id)
    ) {
      return false;
    }
    if (
      definition.duration &&
      this.active.some((event) => event.definition.id === definition.id)
    ) {
      return false;
    }
    const cooldownUntil = this.cooldowns.get(definition.id);
    if (cooldownUntil !== undefined && this.elapsedSeconds < cooldownUntil) {
      return false;
    }
    if (definition.category === 'random') {
      if (this.hasActiveTagConflict(definition)) {
        return false;
      }
      if (
        this.hooks.getLives() <= this.config.random.lowLivesThreshold &&
        this.config.random.lowLivesBlockedEventIds.includes(definition.id)
      ) {
        return false;
      }
    }
    return true;
  }

  private shouldQueue(definition: GameEventDefinition): boolean {
    if (this.queue.length > 0 || this.queueGapRemaining > 0) {
      return true;
    }
    if (definition.duration && this.activeDurationCount >= this.config.maxActiveDurationEvents) {
      return true;
    }
    return false;
  }

  private startEvent(definition: GameEventDefinition): void {
    this.queueGapRemaining = this.config.queueGapSeconds;
    const duration = Math.max(0, definition.duration ?? 0);
    if (duration > 0) {
      this.active.push({
        definition,
        remainingSeconds: duration,
        durationSeconds: duration,
      });
    }

    const presentation = this.grantRewards(definition);
    this.hooks.onEventStarted(definition, presentation);
    if (duration > 0) {
      this.emitActiveEvents();
    }
  }

  private grantRewards(definition: GameEventDefinition): EventPresentation {
    const parts: string[] = [];
    const score = definition.reward?.score ?? 0;
    if (score > 0) {
      this.hooks.onScoreReward(definition, score);
      parts.push(`+${score} điểm`);
    }

    const coins = definition.reward?.coins ?? 0;
    if (coins > 0) {
      const once = definition.reward?.coinsOnce === true;
      const status = this.hooks.onCoinReward(definition, coins, once);
      if (status === 'granted') {
        parts.push(`+${coins} Coins`);
      } else if (status === 'already-claimed') {
        parts.push('Thưởng Coins đã nhận trước đó');
      } else {
        parts.push('Chưa thể lưu Coins');
      }
    }

    return { rewardText: parts.join(' · ') };
  }

  private processQueue(): void {
    if (this.queue.length === 0 || this.queueGapRemaining > 0) {
      return;
    }
    const next = this.queue[0];
    const definition = next.definition;
    if (!this.config.enabled || !definition.enabled) {
      this.queue.shift();
      return;
    }
    if (
      definition.duration &&
      this.activeDurationCount >= this.config.maxActiveDurationEvents
    ) {
      return;
    }
    if (
      definition.category === 'random' &&
      this.hasActiveTagConflict(definition)
    ) {
      return;
    }
    this.queue.shift();
    this.startEvent(definition);
  }

  private cancelLowLivesHazards(): boolean {
    if (this.hooks.getLives() > this.config.random.lowLivesThreshold) {
      return false;
    }
    let ended = false;
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const definition = this.active[index].definition;
      if (this.config.random.lowLivesBlockedEventIds.includes(definition.id)) {
        this.active.splice(index, 1);
        this.hooks.onEventEnded(definition);
        ended = true;
      }
    }
    const before = this.queue.length;
    this.queue = this.queue.filter((queued) => {
      return !this.config.random.lowLivesBlockedEventIds.includes(
        queued.definition.id,
      );
    });
    return ended || this.queue.length !== before;
  }

  private checkSurvivalMilestones(): void {
    for (const definition of this.survivalDefinitions) {
      if (
        this.elapsedSeconds >= getSurvivalSeconds(definition) &&
        !this.firedThisRun.has(definition.id)
      ) {
        this.requestActivation(definition);
      }
    }
  }

  private checkTimedSkillMilestones(): void {
    for (const definition of this.skillDefinitions) {
      if (definition.trigger.type !== 'skill') {
        continue;
      }
      if (definition.trigger.condition !== 'clean-run') {
        continue;
      }
      const threshold =
        definition.trigger.threshold ?? this.config.survival.cleanRunSeconds;
      if (
        this.cleanStreakSeconds >= threshold &&
        !this.firedThisRun.has(definition.id)
      ) {
        this.requestActivation(definition);
      }
    }
  }

  private checkComboSkillMilestones(): void {
    for (const definition of this.skillDefinitions) {
      if (definition.trigger.type !== 'skill') {
        continue;
      }
      switch (definition.trigger.condition) {
        case 'comeback': {
          const threshold =
            definition.trigger.threshold ?? this.config.skills.comebackCombo;
          if (
            this.currentCombo >= threshold &&
            this.hooks.getLives() === 1
          ) {
            this.requestActivation(definition);
          }
          break;
        }
        case 'combo-breaker': {
          if (
            this.currentCombo > this.bestComboAtStart &&
            this.currentCombo >= this.config.skills.comboBreakerMinCombo
          ) {
            this.requestActivation(definition);
          }
          break;
        }
        default:
          break;
      }
    }
  }

  private checkSliceSkillMilestones(info: SliceEventInfo): void {
    for (const definition of this.skillDefinitions) {
      if (definition.trigger.type !== 'skill') {
        continue;
      }
      switch (definition.trigger.condition) {
        case 'perfect-slice': {
          const threshold =
            definition.trigger.threshold ?? this.config.skills.perfectSliceCount;
          if (info.sameSwipeFruitCount >= threshold) {
            this.requestActivation(definition);
          }
          break;
        }
        case 'fruit-master': {
          const threshold =
            definition.trigger.threshold ?? this.config.skills.fruitMasterCount;
          if (this.noMissSlices >= threshold) {
            this.requestActivation(definition);
          }
          break;
        }
        case 'precision-master': {
          const threshold =
            definition.trigger.threshold ??
            this.config.skills.precisionMasterCount;
          if (this.noMissSlices >= threshold) {
            this.requestActivation(definition);
          }
          break;
        }
        case 'color-collector': {
          const threshold =
            definition.trigger.threshold ??
            this.config.skills.colorCollectorCount;
          const windowSeconds =
            definition.trigger.windowSeconds ??
            this.config.skills.colorCollectorWindowSeconds;
          const unique = new Set(
            this.recentSlices
              .filter((slice) => {
                return this.elapsedSeconds - slice.at <= windowSeconds;
              })
              .map((slice) => slice.fruitId),
          );
          if (unique.size >= threshold) {
            this.requestActivation(definition);
          }
          break;
        }
        default:
          break;
      }
    }
  }

  private pruneRecentSlices(): void {
    let windowSeconds = this.config.skills.colorCollectorWindowSeconds;
    for (const definition of this.skillDefinitions) {
      if (
        definition.trigger.type === 'skill' &&
        definition.trigger.condition === 'color-collector' &&
        definition.trigger.windowSeconds
      ) {
        windowSeconds = Math.max(
          windowSeconds,
          definition.trigger.windowSeconds,
        );
      }
    }
    const cutoff = this.elapsedSeconds - windowSeconds;
    while (this.recentSlices.length > 0 && this.recentSlices[0].at < cutoff) {
      this.recentSlices.shift();
    }
  }

  private tryRandomEvent(): void {
    if (this.elapsedSeconds < this.nextRandomRollAt) {
      return;
    }
    this.nextRandomRollAt =
      this.elapsedSeconds + this.config.random.rollIntervalSeconds;
    if (this.elapsedSeconds < this.nextRandomAllowedAt) {
      return;
    }
    if (this.queue.length > 0) {
      return;
    }

    const lives = this.hooks.getLives();
    const lowLives = lives <= this.config.random.lowLivesThreshold;
    const candidates = this.randomDefinitions.filter((definition) => {
      if (definition.trigger.type !== 'random') {
        return false;
      }
      if (!this.canFire(definition)) {
        return false;
      }
      if (
        lowLives &&
        this.config.random.lowLivesBlockedEventIds.includes(definition.id)
      ) {
        return false;
      }
      return true;
    });
    if (candidates.length === 0) {
      return;
    }

    let totalWeight = 0;
    for (const definition of candidates) {
      totalWeight += this.getRandomWeight(definition);
    }
    if (totalWeight <= 0) {
      return;
    }

    let roll = this.random() * totalWeight;
    let selected: GameEventDefinition | null = null;
    for (const definition of candidates) {
      roll -= this.getRandomWeight(definition);
      if (roll <= 0) {
        selected = definition;
        break;
      }
    }
    if (!selected) {
      selected = candidates[candidates.length - 1];
    }

    this.nextRandomAllowedAt =
      this.elapsedSeconds + this.config.random.globalCooldownSeconds;
    this.requestActivation(selected);
  }

  private getRandomWeight(definition: GameEventDefinition): number {
    if (definition.trigger.type !== 'random') {
      return 0;
    }
    const rarityWeight =
      this.config.random.rarityWeights[definition.rarity] ?? 0;
    return Math.max(0, rarityWeight * definition.trigger.weight);
  }

  private getEffectiveCooldown(definition: GameEventDefinition): number {
    const base = Math.max(0, definition.cooldown ?? 0);
    if (definition.trigger.type === 'random') {
      return Math.max(base, definition.trigger.minInterval);
    }
    return base;
  }

  private get activeDurationCount(): number {
    let count = 0;
    for (const event of this.active) {
      if (event.durationSeconds > 0) {
        count += 1;
      }
    }
    return count;
  }

  private hasActiveTagConflict(definition: GameEventDefinition): boolean {
    if (!definition.tags || definition.tags.length === 0) {
      return false;
    }
    for (const event of this.active) {
      const tags = event.definition.tags;
      if (!tags || tags.length === 0) {
        continue;
      }
      for (const tag of definition.tags) {
        if (tags.includes(tag)) {
          return true;
        }
      }
    }
    return false;
  }

  private emitActiveEvents(): void {
    this.hooks.onActiveEventsChanged(this.activeEvents);
  }
}

function getScoreThreshold(definition: GameEventDefinition): number {
  return definition.trigger.type === 'score' ? definition.trigger.threshold : 0;
}

function getComboThreshold(definition: GameEventDefinition): number {
  return definition.trigger.type === 'combo' ? definition.trigger.threshold : 0;
}

function getSurvivalSeconds(definition: GameEventDefinition): number {
  return definition.trigger.type === 'survivalTime'
    ? definition.trigger.seconds
    : 0;
}
