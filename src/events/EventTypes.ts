import type { FruitId } from '../config/gameConfig';

export type EventRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export type EventCategory =
  | 'combo'
  | 'score'
  | 'random'
  | 'achievement'
  | 'survival';

export type EventSkillCondition =
  | 'perfect-slice'
  | 'fruit-master'
  | 'clean-run'
  | 'comeback'
  | 'combo-breaker'
  | 'color-collector'
  | 'precision-master';

export type EventTrigger =
  | { readonly type: 'combo'; readonly threshold: number }
  | { readonly type: 'score'; readonly threshold: number }
  | { readonly type: 'survivalTime'; readonly seconds: number }
  | { readonly type: 'fruitSliced'; readonly count: number }
  | {
      readonly type: 'random';
      readonly weight: number;
      readonly minInterval: number;
    }
  | {
      readonly type: 'skill';
      readonly condition: EventSkillCondition;
      readonly threshold?: number;
      readonly windowSeconds?: number;
    }
  | { readonly type: 'nearMiss' };

export type EventSpecialFruit = 'golden' | 'rainbow';

export interface EventSpawnSpec {
  readonly fruitCount?: number;
  readonly bombCount?: number;
  readonly specialFruit?: EventSpecialFruit;
  readonly specialFruitCount?: number;
  readonly specialLifetime?: number;
  readonly specialScoreMultiplier?: number;
  readonly warningSeconds?: number;
}

export interface EventModifiers {
  readonly scoreMultiplier?: number;
  readonly sliceBonus?: number;
  readonly motionScale?: number;
}

export interface EventReward {
  readonly score?: number;
  readonly coins?: number;
  readonly coinsOnce?: boolean;
}

export interface EventVisuals {
  readonly color: number;
  readonly slashCore?: number;
  readonly slashEdge?: number;
  readonly celebrate?: boolean;
}

export type EventEffectKind =
  | 'announce'
  | 'fruit-burst'
  | 'special-fruit'
  | 'bomb-burst'
  | 'overlay'
  | 'celebrate';

export interface GameEventDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rarity: EventRarity;
  readonly category: EventCategory;
  readonly trigger: EventTrigger;
  readonly effect: EventEffectKind;
  readonly duration?: number;
  readonly cooldown?: number;
  readonly oncePerRun?: boolean;
  readonly priority: number;
  readonly enabled: boolean;
  readonly reward?: EventReward;
  readonly spawn?: EventSpawnSpec;
  readonly modifiers?: EventModifiers;
  readonly visual?: EventVisuals;
  readonly tags?: readonly string[];
}

export interface ActiveEventInfo {
  readonly definition: GameEventDefinition;
  readonly remainingSeconds: number;
  readonly durationSeconds: number;
}

export interface EventPresentation {
  readonly rewardText: string;
}

export interface SliceEventInfo {
  readonly fruitId: FruitId;
  readonly combo: number;
  readonly sameSwipeFruitCount: number;
  readonly points: number;
}

export type CoinRewardStatus = 'granted' | 'already-claimed' | 'failed';

export interface EventHooks {
  onEventStarted(
    definition: GameEventDefinition,
    presentation: EventPresentation,
  ): void;
  onEventEnded(definition: GameEventDefinition): void;
  onActiveEventsChanged(active: readonly ActiveEventInfo[]): void;
  onScoreReward(definition: GameEventDefinition, amount: number): void;
  onCoinReward(
    definition: GameEventDefinition,
    amount: number,
    once: boolean,
  ): CoinRewardStatus;
  getLives(): number;
}

export const RARITY_LABELS: Record<EventRarity, string> = {
  common: 'Phổ biến',
  uncommon: 'Ít gặp',
  rare: 'Hiếm',
  epic: 'Sử thi',
  legendary: 'Huyền thoại',
};
