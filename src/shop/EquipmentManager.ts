import type { SaveManager } from '../persistence/SaveManager';
import {
  getDefaultItem,
  getDefaultItemId,
  getShopItem,
  isCosmeticItem,
} from './ShopCatalog';
import type {
  BackgroundShopItem,
  EquipSlot,
  EquippableShopItem,
  ExplosionShopItem,
  FruitSkinShopItem,
  SlashShopItem,
  SoundPackShopItem,
  ThemeShopItem,
  TrailShopItem,
} from './ShopItem';

export interface EquipmentHooks {
  slash: (item: SlashShopItem) => void;
  background: (item: BackgroundShopItem) => void;
  fruitSkin: (item: FruitSkinShopItem) => void;
  trail: (item: TrailShopItem) => void;
  explosion: (item: ExplosionShopItem) => void;
  soundPack: (item: SoundPackShopItem) => void;
  theme: (item: ThemeShopItem) => void;
}

export type EquipOutcome =
  | { status: 'equipped'; item: EquippableShopItem }
  | { status: 'already-equipped' }
  | { status: 'not-owned' }
  | { status: 'not-found' }
  | { status: 'save-failed' };

export class EquipmentManager {
  constructor(
    private readonly save: SaveManager,
    private readonly hooks: EquipmentHooks,
  ) {}

  getEquippedId(slot: EquipSlot): string {
    return this.save.equippedItems[slot];
  }

  getEquippedItem(slot: EquipSlot): EquippableShopItem {
    const item = getShopItem(this.getEquippedId(slot));
    if (item && isCosmeticItem(item) && item.category === slot) {
      return item;
    }
    return getDefaultItem(slot);
  }

  isOwned(item: EquippableShopItem): boolean {
    return item.isDefault === true || this.save.ownedItemIds.includes(item.id);
  }

  isEquipped(item: EquippableShopItem): boolean {
    return this.save.equippedItems[item.category] === item.id;
  }

  equip(itemId: string): EquipOutcome {
    const item = getShopItem(itemId);
    if (!item || !isCosmeticItem(item)) {
      return { status: 'not-found' };
    }
    if (!this.isOwned(item)) {
      return { status: 'not-owned' };
    }
    if (this.isEquipped(item)) {
      return { status: 'already-equipped' };
    }

    const saved = this.save.transaction((draft) => {
      draft.equippedItems[item.category] = item.id;
    });
    if (!saved) {
      return { status: 'save-failed' };
    }

    this.apply(item);
    return { status: 'equipped', item };
  }

  equipDefault(slot: EquipSlot): EquipOutcome {
    const item = getDefaultItem(slot);
    if (this.isEquipped(item)) {
      return { status: 'already-equipped' };
    }
    return this.equip(item.id);
  }

  getDefaultId(slot: EquipSlot): string {
    return getDefaultItemId(slot);
  }

  applyAll(): void {
    for (const slot of Object.keys(this.save.equippedItems) as EquipSlot[]) {
      this.apply(this.getEquippedItem(slot));
    }
  }

  private apply(item: EquippableShopItem): void {
    try {
      switch (item.category) {
        case 'slash':
          this.hooks.slash(item);
          break;
        case 'background':
          this.hooks.background(item);
          break;
        case 'fruitSkin':
          this.hooks.fruitSkin(item);
          break;
        case 'trail':
          this.hooks.trail(item);
          break;
        case 'explosion':
          this.hooks.explosion(item);
          break;
        case 'soundPack':
          this.hooks.soundPack(item);
          break;
        case 'theme':
          this.hooks.theme(item);
          break;
      }
    } catch (error) {
      // A rendering/audio failure must never break the shop or the game loop.
      console.warn('Failed to apply equipped item', item.id, error);
    }
  }
}
