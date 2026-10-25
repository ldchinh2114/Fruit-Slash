import type { ShopManager } from '../shop/ShopManager';
import { isUpgradeItem } from '../shop/ShopItem';
import type { ShopItem, UpgradeShopItem } from '../shop/ShopItem';

export type ShopAction = 'buy' | 'equip' | 'unequip' | 'none';

export type ShopStateTone =
  | 'default'
  | 'owned'
  | 'equipped'
  | 'affordable'
  | 'insufficient'
  | 'maxed';

export interface ShopItemState {
  statusLabel: string;
  tone: ShopStateTone;
  action: ShopAction;
  actionLabel: string;
  actionEnabled: boolean;
  price: number | null;
  level?: number;
  maxLevel?: number;
}

export function getShopItemState(
  shop: ShopManager,
  item: ShopItem,
): ShopItemState {
  if (isUpgradeItem(item)) {
    return getUpgradeState(shop, item);
  }

  const equipped = shop.isEquipped(item);
  const owned = shop.isOwned(item);
  const isDefault = item.isDefault === true;

  if (equipped) {
    if (isDefault) {
      return {
        statusLabel: 'Mặc định',
        tone: 'default',
        action: 'none',
        actionLabel: 'Đang dùng',
        actionEnabled: false,
        price: null,
      };
    }
    return {
      statusLabel: 'Đang dùng',
      tone: 'equipped',
      action: 'unequip',
      actionLabel: 'Tháo về mặc định',
      actionEnabled: true,
      price: null,
    };
  }

  if (owned) {
    return {
      statusLabel: isDefault ? 'Miễn phí' : 'Đã sở hữu',
      tone: 'owned',
      action: 'equip',
      actionLabel: 'Trang bị',
      actionEnabled: true,
      price: null,
    };
  }

  const affordable = shop.balance >= item.price;
  return {
    statusLabel: affordable ? 'Có thể mua' : 'Thiếu Coins',
    tone: affordable ? 'affordable' : 'insufficient',
    action: 'buy',
    actionLabel: affordable ? 'Mua' : `Thiếu ${(item.price - shop.balance).toLocaleString('vi-VN')}`,
    actionEnabled: affordable,
    price: item.price,
  };
}

function getUpgradeState(
  shop: ShopManager,
  item: UpgradeShopItem,
): ShopItemState {
  const level = shop.getUpgradeLevel(item);
  const maxLevel = shop.getUpgradeMaxLevel(item);
  if (level >= maxLevel) {
    return {
      statusLabel: 'Đã tối đa',
      tone: 'maxed',
      action: 'none',
      actionLabel: 'Cấp tối đa',
      actionEnabled: false,
      price: null,
      level,
      maxLevel,
    };
  }
  const price = shop.getUpgradePrice(item) ?? 0;
  const affordable = shop.balance >= price;
  return {
    statusLabel: `Cấp ${level}/${maxLevel}`,
    tone: affordable ? 'affordable' : 'insufficient',
    action: 'buy',
    actionLabel: affordable
      ? `Nâng cấp · ${price.toLocaleString('vi-VN')}`
      : `Thiếu ${(price - shop.balance).toLocaleString('vi-VN')}`,
    actionEnabled: affordable,
    price,
    level,
    maxLevel,
  };
}
