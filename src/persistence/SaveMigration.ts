import { ECONOMY_CONFIG, UPGRADE_DEFINITIONS } from '../config/economyConfig';
import type { EquipSlot, EquippedItems, UpgradeId } from '../shop/ShopItem';
import { EQUIP_SLOTS } from '../shop/ShopItem';
import {
  DEFAULT_EQUIPPED,
  getShopItem,
  isCosmeticItem,
} from '../shop/ShopCatalog';
import {
  DEFAULT_VOLUME,
  SAVE_VERSION,
  clampInteger,
  clampNumber,
  createDefaultSave,
  createDefaultUpgrades,
  type PlayerSave,
  type PlayerStatistics,
  type UpgradeLevels,
} from './SaveSchema';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStat(
  statistics: UnknownRecord,
  key: keyof PlayerStatistics,
  fallback: number,
): number {
  return clampInteger(statistics[key], fallback, 0, 999_999_999);
}

export function migrateSave(
  raw: unknown,
  legacyBestScore = 0,
): PlayerSave {
  const defaults = createDefaultSave();
  const safeLegacyBest = clampInteger(
    legacyBestScore,
    0,
    0,
    ECONOMY_CONFIG.maxCoins,
  );

  if (!isRecord(raw)) {
    defaults.statistics.bestScore = safeLegacyBest;
    return defaults;
  }

  const rawVersion = clampInteger(raw.version, 0, 0, SAVE_VERSION);
  const rawStatistics = isRecord(raw.statistics) ? raw.statistics : {};
  const rawSettings = isRecord(raw.settings) ? raw.settings : {};
  const rawEquipped = isRecord(raw.equippedItems) ? raw.equippedItems : {};
  const rawUpgrades = isRecord(raw.upgrades) ? raw.upgrades : {};

  const statistics: PlayerStatistics = {
    totalGames: readStat(rawStatistics, 'totalGames', defaults.statistics.totalGames),
    totalScore: readStat(rawStatistics, 'totalScore', defaults.statistics.totalScore),
    bestScore: Math.max(
      readStat(rawStatistics, 'bestScore', 0),
      safeLegacyBest,
      rawVersion === 0 ? clampInteger(raw.bestScore, 0, 0, ECONOMY_CONFIG.maxCoins) : 0,
    ),
    totalFruits: readStat(rawStatistics, 'totalFruits', defaults.statistics.totalFruits),
    totalBombs: readStat(rawStatistics, 'totalBombs', defaults.statistics.totalBombs),
    totalCoinsEarned: readStat(
      rawStatistics,
      'totalCoinsEarned',
      defaults.statistics.totalCoinsEarned,
    ),
    totalCoinsSpent: readStat(
      rawStatistics,
      'totalCoinsSpent',
      defaults.statistics.totalCoinsSpent,
    ),
    bestCombo: readStat(
      rawStatistics,
      'bestCombo',
      defaults.statistics.bestCombo,
    ),
  };

  const upgrades: UpgradeLevels = createDefaultUpgrades();
  for (const upgradeId of Object.keys(UPGRADE_DEFINITIONS) as UpgradeId[]) {
    upgrades[upgradeId] = clampInteger(
      rawUpgrades[upgradeId],
      0,
      0,
      UPGRADE_DEFINITIONS[upgradeId].maxLevel,
    );
  }

  const ownedItemIds: string[] = [];
  if (Array.isArray(raw.ownedItemIds)) {
    for (const candidate of raw.ownedItemIds) {
      if (typeof candidate !== 'string' || ownedItemIds.includes(candidate)) {
        continue;
      }
      const item = getShopItem(candidate);
      if (item && isCosmeticItem(item)) {
        ownedItemIds.push(candidate);
      }
    }
  }

  const equippedItems: EquippedItems = { ...DEFAULT_EQUIPPED };
  for (const slot of EQUIP_SLOTS) {
    const candidate = rawEquipped[slot];
    if (typeof candidate !== 'string') {
      continue;
    }
    const item = getShopItem(candidate);
    if (
      item &&
      isCosmeticItem(item) &&
      item.category === slot &&
      (item.isDefault || ownedItemIds.includes(item.id))
    ) {
      equippedItems[slot] = item.id;
    }
  }

  const claimedAchievementIds: string[] = [];
  if (Array.isArray(raw.claimedAchievementIds)) {
    for (const candidate of raw.claimedAchievementIds) {
      if (
        typeof candidate !== 'string' ||
        candidate.length === 0 ||
        candidate.length > 64 ||
        claimedAchievementIds.includes(candidate)
      ) {
        continue;
      }
      claimedAchievementIds.push(candidate);
      if (claimedAchievementIds.length >= 64) {
        break;
      }
    }
  }

  const save: PlayerSave = {
    version: SAVE_VERSION,
    coins: clampInteger(raw.coins, defaults.coins, 0, ECONOMY_CONFIG.maxCoins),
    ownedItemIds,
    equippedItems,
    upgrades,
    statistics,
    settings: {
      soundEnabled:
        typeof rawSettings.soundEnabled === 'boolean'
          ? rawSettings.soundEnabled
          : defaults.settings.soundEnabled,
      volume: clampNumber(
        rawSettings.volume,
        DEFAULT_VOLUME,
        0,
        1,
      ),
    },
    lastRewardedRunId:
      typeof raw.lastRewardedRunId === 'string' &&
      raw.lastRewardedRunId.length > 0 &&
      raw.lastRewardedRunId.length <= 128
        ? raw.lastRewardedRunId
        : null,
    claimedAchievementIds,
  };

  return validateEquippedSlots(save);
}

function validateEquippedSlots(save: PlayerSave): PlayerSave {
  for (const slot of EQUIP_SLOTS) {
    const itemId = save.equippedItems[slot];
    const item = getShopItem(itemId);
    if (
      !item ||
      !isCosmeticItem(item) ||
      item.category !== slot ||
      (!item.isDefault && !save.ownedItemIds.includes(itemId))
    ) {
      save.equippedItems[slot] = getSlotDefault(slot);
    }
  }
  return save;
}

function getSlotDefault(slot: EquipSlot): string {
  return DEFAULT_EQUIPPED[slot];
}
