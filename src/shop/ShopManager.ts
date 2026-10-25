import type { SaveManager } from '../persistence/SaveManager';
import type { CurrencyManager } from '../economy/CurrencyManager';
import type { EquipmentManager } from './EquipmentManager';
import type { EquipOutcome } from './EquipmentManager';
import type { UpgradeManager } from './UpgradeManager';
import { getShopItem, isCosmeticItem } from './ShopCatalog';
import type {
  EquipSlot,
  EquippableShopItem,
  ShopItem,
  UpgradeShopItem,
} from './ShopItem';

export type BuyResult =
  | {
      status: 'purchased';
      item: ShopItem;
      price: number;
      balance: number;
    }
  | {
      status: 'upgraded';
      item: UpgradeShopItem;
      price: number;
      level: number;
      balance: number;
    }
  | { status: 'insufficient'; price: number; missing: number }
  | { status: 'owned' }
  | { status: 'maxed' }
  | { status: 'not-found' }
  | { status: 'save-failed' };

export class ShopManager {
  private busy = false;

  constructor(
    private readonly save: SaveManager,
    private readonly currency: CurrencyManager,
    private readonly equipment: EquipmentManager,
    private readonly upgrades: UpgradeManager,
  ) {}

  get balance(): number {
    return this.save.coins;
  }

  getItem(itemId: string): ShopItem | undefined {
    return getShopItem(itemId);
  }

  isOwned(item: ShopItem): boolean {
    return isCosmeticItem(item) ? this.equipment.isOwned(item) : false;
  }

  isEquipped(item: EquippableShopItem): boolean {
    return this.equipment.isEquipped(item);
  }

  getEquippedId(slot: EquipSlot): string {
    return this.equipment.getEquippedId(slot);
  }

  getDefaultId(slot: EquipSlot): string {
    return this.equipment.getDefaultId(slot);
  }

  getUpgradeLevel(item: UpgradeShopItem): number {
    return this.upgrades.getLevel(item.upgradeId);
  }

  getUpgradeMaxLevel(item: UpgradeShopItem): number {
    return this.upgrades.getMaxLevel(item.upgradeId);
  }

  getUpgradePrice(item: UpgradeShopItem): number | null {
    return this.upgrades.getNextPrice(item.upgradeId);
  }

  getUpgradeEffect(item: UpgradeShopItem, level: number): string {
    return this.upgrades.getEffectLabel(item.upgradeId, level);
  }

  buy(itemId: string): BuyResult {
    if (this.busy) {
      return { status: 'save-failed' };
    }
    const item = getShopItem(itemId);
    if (!item) {
      return { status: 'not-found' };
    }
    this.busy = true;
    try {
      if (item.category === 'upgrade') {
        return this.buyUpgrade(item);
      }
      return this.buyCosmetic(item);
    } finally {
      this.busy = false;
    }
  }

  equip(itemId: string): EquipOutcome {
    if (this.busy) {
      return { status: 'save-failed' };
    }
    this.busy = true;
    try {
      return this.equipment.equip(itemId);
    } finally {
      this.busy = false;
    }
  }

  unequip(slot: EquipSlot): EquipOutcome {
    if (this.busy) {
      return { status: 'save-failed' };
    }
    this.busy = true;
    try {
      return this.equipment.equipDefault(slot);
    } finally {
      this.busy = false;
    }
  }

  private buyCosmetic(
    item: EquippableShopItem,
  ): BuyResult {
    if (this.equipment.isOwned(item)) {
      return { status: 'owned' };
    }
    if (!this.currency.canAfford(item.price)) {
      return {
        status: 'insufficient',
        price: item.price,
        missing: Math.max(0, item.price - this.save.coins),
      };
    }

    const outcome = this.currency.spend(item.price, (draft) => {
      if (draft.ownedItemIds.includes(item.id)) {
        return false;
      }
      draft.ownedItemIds.push(item.id);
    });
    if (outcome === 'insufficient') {
      return {
        status: 'insufficient',
        price: item.price,
        missing: Math.max(0, item.price - this.save.coins),
      };
    }
    if (outcome !== 'ok') {
      return { status: 'save-failed' };
    }
    return {
      status: 'purchased',
      item,
      price: item.price,
      balance: this.save.coins,
    };
  }

  private buyUpgrade(item: UpgradeShopItem): BuyResult {
    const outcome = this.upgrades.purchase(item.upgradeId);
    switch (outcome.status) {
      case 'purchased': {
        const balance = this.save.coins;
        return {
          status: 'upgraded',
          item,
          price: outcome.price,
          level: outcome.level,
          balance,
        };
      }
      case 'maxed':
        return { status: 'maxed' };
      case 'insufficient': {
        const price = this.upgrades.getNextPrice(item.upgradeId) ?? 0;
        return {
          status: 'insufficient',
          price,
          missing: Math.max(0, price - this.save.coins),
        };
      }
      case 'save-failed':
        return { status: 'save-failed' };
    }
  }
}
