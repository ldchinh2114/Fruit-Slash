import { ECONOMY_CONFIG } from '../config/economyConfig';
import type { SaveManager } from '../persistence/SaveManager';
import { clampInteger } from '../persistence/SaveSchema';
import type { UpgradeManager } from '../shop/UpgradeManager';

export interface RunRewardInput {
  runId: string;
  score: number;
  fruitsSliced: number;
  bombsSliced: number;
  luckyCoins: number;
  bestCombo: number;
}

export interface RunRewardResult {
  saved: boolean;
  duplicate: boolean;
  baseCoins: number;
  luckyCoins: number;
  coinsEarned: number;
  balance: number;
}

export class RewardService {
  constructor(
    private readonly save: SaveManager,
    private readonly upgrades: UpgradeManager,
  ) {}

  grantRunReward(input: RunRewardInput): RunRewardResult {
    const score = clampInteger(input.score, 0, 0, 999_999_999);
    const fruitsSliced = clampInteger(input.fruitsSliced, 0, 0, 999_999_999);
    const bombsSliced = clampInteger(input.bombsSliced, 0, 0, 999_999_999);
    const bestCombo = clampInteger(input.bestCombo, 0, 0, 999_999_999);
    const luckyCoins = clampInteger(input.luckyCoins, 0, 0, ECONOMY_CONFIG.maxCoins);
    const baseCoins = Math.floor(
      score * ECONOMY_CONFIG.coinsPerScorePoint * this.upgrades.getCoinMultiplier(),
    );
    const requestedCoins = baseCoins + luckyCoins;

    if (!input.runId) {
      return {
        saved: false,
        duplicate: false,
        baseCoins,
        luckyCoins,
        coinsEarned: 0,
        balance: this.save.coins,
      };
    }

    let duplicate = false;
    let coinsEarned = 0;
    let appliedLuckyCoins = 0;

    const saved = this.save.transaction((draft) => {
      if (draft.lastRewardedRunId === input.runId) {
        duplicate = true;
        return false;
      }

      const before = draft.coins;
      draft.coins = Math.min(
        ECONOMY_CONFIG.maxCoins,
        before + requestedCoins,
      );
      coinsEarned = draft.coins - before;
      appliedLuckyCoins = Math.min(luckyCoins, coinsEarned);

      draft.lastRewardedRunId = input.runId;
      draft.statistics.totalGames += 1;
      draft.statistics.totalScore += score;
      draft.statistics.bestScore = Math.max(draft.statistics.bestScore, score);
      draft.statistics.totalFruits += fruitsSliced;
      draft.statistics.totalBombs += bombsSliced;
      draft.statistics.bestCombo = Math.max(
        draft.statistics.bestCombo,
        bestCombo,
      );
      draft.statistics.totalCoinsEarned += coinsEarned;
    });

    return {
      saved,
      duplicate,
      baseCoins,
      luckyCoins: appliedLuckyCoins,
      coinsEarned: saved ? coinsEarned : 0,
      balance: this.save.coins,
    };
  }
}
