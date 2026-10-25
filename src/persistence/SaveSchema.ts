import { ECONOMY_CONFIG, UPGRADE_DEFINITIONS } from '../config/economyConfig';
import type { EquippedItems, UpgradeId } from '../shop/ShopItem';
import { DEFAULT_EQUIPPED } from '../shop/ShopCatalog';

export const SAVE_STORAGE_KEY = 'fruit-slash-3d:save';
export const LEGACY_BEST_SCORE_KEY = 'fruit-slash-3d:best-score';
export const SAVE_VERSION = 2;
export const DEFAULT_VOLUME = 0.7;

export type UpgradeLevels = Record<UpgradeId, number>;

export interface PlayerStatistics {
  totalGames: number;
  totalScore: number;
  bestScore: number;
  totalFruits: number;
  totalBombs: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  bestCombo: number;
}

export interface PlayerSettings {
  soundEnabled: boolean;
  volume: number;
}

export interface PlayerSave {
  version: number;
  coins: number;
  ownedItemIds: string[];
  equippedItems: EquippedItems;
  upgrades: UpgradeLevels;
  statistics: PlayerStatistics;
  settings: PlayerSettings;
  lastRewardedRunId: string | null;
  claimedAchievementIds: string[];
}

export function createDefaultUpgrades(): UpgradeLevels {
  return {
    bonusCoins: 0,
    scoreBonus: 0,
    comboBonus: 0,
    luckyDrop: 0,
    comboWindow: 0,
    missShield: 0,
  };
}

export function createDefaultStatistics(): PlayerStatistics {
  return {
    totalGames: 0,
    totalScore: 0,
    bestScore: 0,
    totalFruits: 0,
    totalBombs: 0,
    totalCoinsEarned: 0,
    totalCoinsSpent: 0,
    bestCombo: 0,
  };
}

export function createDefaultSave(): PlayerSave {
  return {
    version: SAVE_VERSION,
    coins: ECONOMY_CONFIG.startingCoins,
    ownedItemIds: [],
    equippedItems: { ...DEFAULT_EQUIPPED },
    upgrades: createDefaultUpgrades(),
    statistics: createDefaultStatistics(),
    settings: {
      soundEnabled: true,
      volume: DEFAULT_VOLUME,
    },
    lastRewardedRunId: null,
    claimedAchievementIds: [],
  };
}

export function cloneSave(save: PlayerSave): PlayerSave {
  return JSON.parse(JSON.stringify(save)) as PlayerSave;
}

export function clampInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}

export function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

export function getMaxUpgradeLevel(upgradeId: UpgradeId): number {
  return UPGRADE_DEFINITIONS[upgradeId].maxLevel;
}
