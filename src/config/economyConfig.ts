import type { UpgradeId } from '../shop/ShopItem';

export interface UpgradeDefinition {
  readonly id: UpgradeId;
  readonly name: string;
  readonly maxLevel: number;
  readonly basePrice: number;
  readonly priceStep: number;
  readonly valuePerLevel: number;
}

export const ECONOMY_CONFIG = {
  coinsPerScorePoint: 1,
  maxCoins: 9_999_999,
  comboWindowSeconds: 5,
  comboMinCount: 3,
  startingCoins: 0,
} as const;

export const UPGRADE_DEFINITIONS: Record<UpgradeId, UpgradeDefinition> = {
  bonusCoins: {
    id: 'bonusCoins',
    name: 'Bonus Coins',
    maxLevel: 5,
    basePrice: 400,
    priceStep: 450,
    valuePerLevel: 0.1,
  },
  scoreBonus: {
    id: 'scoreBonus',
    name: 'Score Bonus',
    maxLevel: 5,
    basePrice: 500,
    priceStep: 550,
    valuePerLevel: 0.08,
  },
  comboBonus: {
    id: 'comboBonus',
    name: 'Combo Bonus',
    maxLevel: 5,
    basePrice: 450,
    priceStep: 500,
    valuePerLevel: 1,
  },
  luckyDrop: {
    id: 'luckyDrop',
    name: 'Lucky Drop',
    maxLevel: 5,
    basePrice: 600,
    priceStep: 650,
    valuePerLevel: 0.04,
  },
  comboWindow: {
    id: 'comboWindow',
    name: 'Combo Window',
    maxLevel: 5,
    basePrice: 550,
    priceStep: 500,
    valuePerLevel: 0.12,
  },
  missShield: {
    id: 'missShield',
    name: 'Miss Shield',
    maxLevel: 5,
    basePrice: 600,
    priceStep: 600,
    valuePerLevel: 0.05,
  },
};

export function getUpgradePrice(
  upgradeId: UpgradeId,
  currentLevel: number,
): number {
  const definition = UPGRADE_DEFINITIONS[upgradeId];
  const safeLevel = Math.max(0, Math.floor(currentLevel));
  return definition.basePrice + definition.priceStep * safeLevel;
}

export function getUpgradeEffectLabel(
  upgradeId: UpgradeId,
  level: number,
): string {
  const safeLevel = Math.max(0, Math.floor(level));
  switch (upgradeId) {
    case 'bonusCoins':
      return `+${Math.round(safeLevel * 10)}% Coins`;
    case 'scoreBonus':
      return `+${Math.round(safeLevel * 8)}% điểm`;
    case 'comboBonus':
      return safeLevel > 0
        ? `+${safeLevel} điểm mỗi bậc combo`
        : 'Chưa có thưởng combo';
    case 'luckyDrop':
      return safeLevel > 0
        ? `${Math.round(safeLevel * 4)}% cơ hội rơi ${safeLevel * 2} Coins`
        : 'Chưa có Lucky Drop';
    case 'comboWindow': {
      const seconds = safeLevel * UPGRADE_DEFINITIONS.comboWindow.valuePerLevel;
      return safeLevel > 0
        ? `+${seconds.toFixed(2).replace('.', ',')} giây combo`
        : 'Cửa sổ combo mặc định';
    }
    case 'missShield':
      return safeLevel > 0
        ? `-${Math.round(safeLevel * UPGRADE_DEFINITIONS.missShield.valuePerLevel * 100)}% điểm phạt`
        : 'Chưa giảm điểm phạt';
  }
}
