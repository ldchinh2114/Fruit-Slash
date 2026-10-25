import { ECONOMY_CONFIG } from '../config/economyConfig';
import type { SaveManager } from '../persistence/SaveManager';
import type { PlayerSave } from '../persistence/SaveSchema';

export type SpendOutcome = 'ok' | 'insufficient' | 'invalid' | 'save-failed';

export interface OnceRewardResult {
  status: 'granted' | 'already-claimed' | 'save-failed';
  coinsEarned: number;
  balance: number;
}

export class CurrencyManager {
  constructor(private readonly save: SaveManager) {}

  get balance(): number {
    return this.save.coins;
  }

  canAfford(price: number): boolean {
    return (
      Number.isFinite(price) &&
      price >= 0 &&
      this.save.coins >= Math.floor(price)
    );
  }

  /**
   * Debits coins and persists together with the caller's changes in a single
   * transaction. The price always comes from the internal catalog, never the UI.
   */
  spend(
    price: number,
    apply: (draft: PlayerSave) => boolean | void,
  ): SpendOutcome {
    const amount = Math.floor(price);
    if (!Number.isFinite(amount) || amount < 0) {
      return 'invalid';
    }
    if (this.save.coins < amount) {
      return 'insufficient';
    }

    const saved = this.save.transaction((draft) => {
      if (draft.coins < amount) {
        return false;
      }
      draft.coins -= amount;
      draft.statistics.totalCoinsSpent += amount;
      return apply(draft);
    });

    return saved ? 'ok' : 'save-failed';
  }

  credit(amount: number): boolean {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (!Number.isFinite(safeAmount)) {
      return false;
    }
    return this.save.transaction((draft) => {
      const before = draft.coins;
      draft.coins = Math.min(
        ECONOMY_CONFIG.maxCoins,
        before + safeAmount,
      );
      draft.statistics.totalCoinsEarned += draft.coins - before;
    });
  }

  /**
   * Claims an achievement reward at most once for the whole player profile.
   * The claim flag and the coin credit are committed in the same transaction,
   * so a failed write can never leave the reward half-applied.
   */
  grantOnce(claimId: string, amount: number): OnceRewardResult {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (
      claimId.length === 0 ||
      !Number.isFinite(safeAmount) ||
      this.save.claimedAchievementIds.includes(claimId)
    ) {
      return {
        status: 'already-claimed',
        coinsEarned: 0,
        balance: this.save.coins,
      };
    }

    let coinsEarned = 0;
    let duplicate = false;
    const saved = this.save.transaction((draft) => {
      if (draft.claimedAchievementIds.includes(claimId)) {
        duplicate = true;
        return false;
      }
      draft.claimedAchievementIds.push(claimId);
      const before = draft.coins;
      draft.coins = Math.min(ECONOMY_CONFIG.maxCoins, before + safeAmount);
      coinsEarned = draft.coins - before;
      draft.statistics.totalCoinsEarned += coinsEarned;
    });

    if (!saved) {
      return {
        status: duplicate ? 'already-claimed' : 'save-failed',
        coinsEarned: 0,
        balance: this.save.coins,
      };
    }

    return {
      status: 'granted',
      coinsEarned,
      balance: this.save.coins,
    };
  }
}
