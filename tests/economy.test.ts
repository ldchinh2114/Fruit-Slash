import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrencyManager } from '../src/economy/CurrencyManager';
import { RewardService } from '../src/economy/RewardService';
import { SaveManager } from '../src/persistence/SaveManager';
import type { UpgradeManager } from '../src/shop/UpgradeManager';

class MemoryStorage {
  private readonly data = new Map<string, string>();
  failWrites = false;

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) {
      throw new Error('storage unavailable');
    }
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

const upgrades = {
  getCoinMultiplier: () => 1,
} as unknown as UpgradeManager;

function installStorage() {
  const storage = new MemoryStorage();
  vi.stubGlobal('window', { localStorage: storage });
  return storage;
}

describe('achievement coin persistence', () => {
  beforeEach(() => {
    installStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('claims an achievement reward once and keeps it across reloads', () => {
    const save = new SaveManager();
    const currency = new CurrencyManager(save);

    const first = currency.grantOnce('skill-perfect-slice', 40);
    expect(first.status).toBe('granted');
    expect(first.coinsEarned).toBe(40);
    expect(save.claimedAchievementIds).toContain('skill-perfect-slice');

    const reloaded = new SaveManager();
    const balanceAfterReload = reloaded.coins;
    const second = new CurrencyManager(reloaded).grantOnce(
      'skill-perfect-slice',
      40,
    );

    expect(second.status).toBe('already-claimed');
    expect(second.coinsEarned).toBe(0);
    expect(reloaded.coins).toBe(balanceAfterReload);
    expect(
      reloaded.claimedAchievementIds.filter((id) => {
        return id === 'skill-perfect-slice';
      }),
    ).toHaveLength(1);
  });

  it('rolls back the claim when persistence fails', () => {
    const save = new SaveManager();
    const storage = window.localStorage as unknown as MemoryStorage;
    storage.failWrites = true;

    const result = new CurrencyManager(save).grantOnce(
      'skill-fruit-master',
      100,
    );

    expect(result.status).toBe('save-failed');
    expect(result.coinsEarned).toBe(0);
    expect(save.coins).toBe(0);
    expect(save.claimedAchievementIds).toHaveLength(0);
  });
});

describe('run rewards', () => {
  beforeEach(() => {
    installStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves best combo and refuses to reward the same run twice', () => {
    const save = new SaveManager();
    const rewards = new RewardService(save, upgrades);
    const run = {
      runId: 'run-1',
      score: 1000,
      fruitsSliced: 50,
      bombsSliced: 2,
      luckyCoins: 5,
      bestCombo: 37,
    };

    const first = rewards.grantRunReward(run);
    expect(first.saved).toBe(true);
    expect(first.coinsEarned).toBe(1005);
    expect(save.statistics.bestCombo).toBe(37);
    expect(save.statistics.totalGames).toBe(1);

    const balanceAfterFirstRun = save.coins;
    const duplicate = rewards.grantRunReward(run);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.coinsEarned).toBe(0);
    expect(save.coins).toBe(balanceAfterFirstRun);
    expect(save.statistics.totalGames).toBe(1);

    const secondRun = rewards.grantRunReward({
      ...run,
      runId: 'run-2',
      score: 10,
      luckyCoins: 0,
      bestCombo: 12,
    });
    expect(secondRun.saved).toBe(true);
    expect(save.statistics.bestCombo).toBe(37);

    const reloaded = new SaveManager();
    expect(reloaded.statistics.bestCombo).toBe(37);
    expect(reloaded.statistics.totalGames).toBe(2);
    expect(reloaded.lastRewardedRunId).toBe('run-2');
  });
});
