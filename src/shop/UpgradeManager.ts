import {
  ECONOMY_CONFIG,
  UPGRADE_DEFINITIONS,
  getUpgradeEffectLabel,
  getUpgradePrice,
} from '../config/economyConfig';
import { GAME_CONFIG } from '../config/gameConfig';
import type { UpgradeId } from '../shop/ShopItem';
import type { SaveManager } from '../persistence/SaveManager';
import type { CurrencyManager } from '../economy/CurrencyManager';

export type UpgradePurchaseResult =
  | { status: 'purchased'; level: number; price: number }
  | { status: 'maxed' }
  | { status: 'insufficient' }
  | { status: 'save-failed' };

const LUCKY_COINS_PER_LEVEL = 2;

export class UpgradeManager {
  constructor(
    private readonly save: SaveManager,
    private readonly currency: CurrencyManager,
  ) {}

  getLevel(upgradeId: UpgradeId): number {
    return this.save.upgrades[upgradeId] ?? 0;
  }

  getMaxLevel(upgradeId: UpgradeId): number {
    return UPGRADE_DEFINITIONS[upgradeId].maxLevel;
  }

  isMaxed(upgradeId: UpgradeId): boolean {
    return this.getLevel(upgradeId) >= this.getMaxLevel(upgradeId);
  }

  getNextPrice(upgradeId: UpgradeId): number | null {
    if (this.isMaxed(upgradeId)) {
      return null;
    }
    return getUpgradePrice(upgradeId, this.getLevel(upgradeId));
  }

  getEffectLabel(upgradeId: UpgradeId, level = this.getLevel(upgradeId)): string {
    return getUpgradeEffectLabel(upgradeId, level);
  }

  getCoinMultiplier(): number {
    const definition = UPGRADE_DEFINITIONS.bonusCoins;
    return 1 + this.getLevel('bonusCoins') * definition.valuePerLevel;
  }

  getScoreMultiplier(): number {
    const definition = UPGRADE_DEFINITIONS.scoreBonus;
    return 1 + this.getLevel('scoreBonus') * definition.valuePerLevel;
  }

  getComboBonus(comboCount: number): number {
    const definition = UPGRADE_DEFINITIONS.comboBonus;
    const level = this.getLevel('comboBonus');
    if (level <= 0 || comboCount < ECONOMY_CONFIG.comboMinCount) {
      return 0;
    }
    const steps = comboCount - (ECONOMY_CONFIG.comboMinCount - 1);
    return steps * level * definition.valuePerLevel;
  }

  getLuckyDropChance(): number {
    return (
      this.getLevel('luckyDrop') *
      UPGRADE_DEFINITIONS.luckyDrop.valuePerLevel
    );
  }

  getComboWindowSeconds(): number {
    return (
      ECONOMY_CONFIG.comboWindowSeconds +
      this.getLevel('comboWindow') *
        UPGRADE_DEFINITIONS.comboWindow.valuePerLevel
    );
  }

  getMissPenaltyFactor(): number {
    const reduction =
      this.getLevel('missShield') *
      UPGRADE_DEFINITIONS.missShield.valuePerLevel;
    return Math.max(
      0.1,
      GAME_CONFIG.score.missPenaltyFactor * (1 - reduction),
    );
  }

  rollLuckyDrop(): number {
    const level = this.getLevel('luckyDrop');
    if (level <= 0) {
      return 0;
    }
    const chance = Math.min(1, this.getLuckyDropChance());
    if (Math.random() >= chance) {
      return 0;
    }
    return level * LUCKY_COINS_PER_LEVEL;
  }

  purchase(upgradeId: UpgradeId): UpgradePurchaseResult {
    if (this.isMaxed(upgradeId)) {
      return { status: 'maxed' };
    }
    const price = getUpgradePrice(upgradeId, this.getLevel(upgradeId));
    if (!this.currency.canAfford(price)) {
      return { status: 'insufficient' };
    }

    let newLevel = this.getLevel(upgradeId);
    const outcome = this.currency.spend(price, (draft) => {
      const currentLevel = draft.upgrades[upgradeId];
      if (currentLevel >= this.getMaxLevel(upgradeId)) {
        return false;
      }
      draft.upgrades[upgradeId] = currentLevel + 1;
      newLevel = currentLevel + 1;
    });

    if (outcome === 'insufficient') {
      return { status: 'insufficient' };
    }
    if (outcome !== 'ok') {
      return { status: 'save-failed' };
    }
    return { status: 'purchased', level: newLevel, price };
  }
}
