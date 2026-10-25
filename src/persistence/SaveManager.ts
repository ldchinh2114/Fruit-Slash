import {
  LEGACY_BEST_SCORE_KEY,
  SAVE_STORAGE_KEY,
  cloneSave,
  createDefaultSave,
  type PlayerSave,
  type PlayerSettings,
  type PlayerStatistics,
  type UpgradeLevels,
} from './SaveSchema';
import { migrateSave } from './SaveMigration';
import type { EquippedItems } from '../shop/ShopItem';

export class SaveManager {
  private state: PlayerSave;

  constructor() {
    this.state = this.load();
  }

  get coins(): number {
    return this.state.coins;
  }

  get statistics(): Readonly<PlayerStatistics> {
    return this.state.statistics;
  }

  get settings(): Readonly<PlayerSettings> {
    return this.state.settings;
  }

  get equippedItems(): Readonly<EquippedItems> {
    return this.state.equippedItems;
  }

  get upgrades(): Readonly<UpgradeLevels> {
    return this.state.upgrades;
  }

  get ownedItemIds(): readonly string[] {
    return this.state.ownedItemIds;
  }

  get lastRewardedRunId(): string | null {
    return this.state.lastRewardedRunId;
  }

  get claimedAchievementIds(): readonly string[] {
    return this.state.claimedAchievementIds;
  }

  get snapshot(): Readonly<PlayerSave> {
    return this.state;
  }

  /**
   * Mutates and persists atomically. If persistence fails, every change made by
   * the mutator is rolled back so the UI never reflects an unsaved transaction.
   */
  transaction(mutator: (draft: PlayerSave) => boolean | void): boolean {
    const snapshot = cloneSave(this.state);
    let shouldCommit = false;
    try {
      const result = mutator(this.state);
      shouldCommit = result !== false;
    } catch {
      shouldCommit = false;
    }

    if (!shouldCommit) {
      this.state = snapshot;
      return false;
    }

    if (!this.persist()) {
      this.state = snapshot;
      return false;
    }

    return true;
  }

  reset(): boolean {
    const snapshot = cloneSave(this.state);
    this.state = createDefaultSave();
    try {
      window.localStorage.removeItem(LEGACY_BEST_SCORE_KEY);
    } catch {
      // Ignore storage availability errors.
    }
    if (!this.persist()) {
      this.state = snapshot;
      return false;
    }
    return true;
  }

  private persist(): boolean {
    try {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(this.state));
      return true;
    } catch {
      return false;
    }
  }

  private load(): PlayerSave {
    const legacyBest = this.readLegacyBestScore();
    try {
      const stored = window.localStorage.getItem(SAVE_STORAGE_KEY);
      if (!stored) {
        return migrateSave(null, legacyBest);
      }
      return migrateSave(JSON.parse(stored) as unknown, 0);
    } catch {
      return migrateSave(null, legacyBest);
    }
  }

  private readLegacyBestScore(): number {
    try {
      const stored = window.localStorage.getItem(LEGACY_BEST_SCORE_KEY);
      if (!stored) {
        return 0;
      }
      const parsed = Number.parseInt(stored, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }
}
