import { requireId } from './dom';
import type { ShopManager } from '../shop/ShopManager';
import { isUpgradeItem } from '../shop/ShopItem';
import type { ShopItem } from '../shop/ShopItem';
import { CATEGORY_LABELS, RARITY_LABELS, renderItemPreview } from './ItemPreview';
import { getShopItemState } from './ShopItemState';

export interface ItemDetailsHandlers {
  onAction(itemId: string): void;
  onPreviewSound(itemId: string): void;
}

const EFFECT_NOTES: Record<string, string> = {
  slash: 'Đổi màu lõi, viền, quầng sáng và hạt lóe của mọi đường chém trong game.',
  background: 'Được dùng làm phông nền 3D thật trong ván chơi.',
  fruitSkin: 'Phủ lên mọi loại trái cây; hitbox, độ rơi và điểm số giữ nguyên.',
  trail: 'Phát hạt giới hạn phía sau trái cây và bom đang bay.',
  explosion: 'Đổi hình ảnh và âm thanh vụ nổ; vẫn chỉ mất đúng 1 trái tim.',
  soundPack: 'Áp dụng cho tiếng chém, chém hụt, bom, mua hàng và kết thúc ván.',
  theme: 'Đổi màu điểm nhấn giao diện; không ghi đè phông nền đang trang bị.',
};

export class ItemDetailsPanel {
  private readonly root = requireId('shop-details');
  private readonly preview = requireId('detail-preview');
  private readonly category = requireId('detail-category');
  private readonly name = requireId('detail-name');
  private readonly rarity = requireId('detail-rarity');
  private readonly description = requireId('detail-desc');
  private readonly status = requireId('detail-status');
  private readonly effect = requireId('detail-effect');
  private readonly actions = requireId('detail-actions');

  show(
    shop: ShopManager,
    item: ShopItem,
    handlers: ItemDetailsHandlers,
  ): void {
    this.root.hidden = false;
    this.preview.dataset.category = item.category;
    renderItemPreview(this.preview, item, {
      level: isUpgradeItem(item) ? shop.getUpgradeLevel(item) : undefined,
      maxLevel: isUpgradeItem(item) ? shop.getUpgradeMaxLevel(item) : undefined,
    });
    this.category.textContent = CATEGORY_LABELS[item.category];
    this.name.textContent = item.name;
    this.rarity.className = `rarity rarity--${item.rarity}`;
    this.rarity.textContent = RARITY_LABELS[item.rarity];
    this.description.textContent = item.description;

    const state = getShopItemState(shop, item);
    this.status.replaceChildren();
    const chip = document.createElement('span');
    chip.className = `shop-state shop-state--${state.tone}`;
    chip.textContent = state.statusLabel;
    this.status.appendChild(chip);

    if (isUpgradeItem(item)) {
      const level = shop.getUpgradeLevel(item);
      const maxLevel = shop.getUpgradeMaxLevel(item);
      const currentEffect = shop.getUpgradeEffect(item, level);
      const nextEffect =
        level < maxLevel
          ? shop.getUpgradeEffect(item, level + 1)
          : null;
      this.effect.textContent = nextEffect
        ? `Hiện tại: ${currentEffect}. Cấp kế tiếp: ${nextEffect}.`
        : `Đã đạt hiệu ứng tối đa: ${currentEffect}.`;
    } else if (state.price !== null) {
      const price = document.createElement('span');
      price.className = 'detail-price';
      price.innerHTML = '<span class="coin-icon coin-icon--small" aria-hidden="true"></span>';
      price.append(state.price.toLocaleString('vi-VN'));
      this.status.appendChild(price);
      this.effect.textContent = EFFECT_NOTES[item.category] ?? '';
    } else {
      this.effect.textContent = EFFECT_NOTES[item.category] ?? '';
    }

    this.actions.replaceChildren();
    const primary = document.createElement('button');
    primary.type = 'button';
    primary.className = 'btn btn--primary detail-primary';
    primary.disabled = !state.actionEnabled;
    primary.textContent = this.getPrimaryLabel(state.action, state.actionLabel, state.price);
    primary.addEventListener('click', () => {
      handlers.onAction(item.id);
    });
    this.actions.appendChild(primary);

    if (item.category === 'soundPack') {
      const previewButton = document.createElement('button');
      previewButton.type = 'button';
      previewButton.className = 'btn btn--ghost';
      previewButton.textContent = 'Nghe thử';
      previewButton.addEventListener('click', () => {
        handlers.onPreviewSound(item.id);
      });
      this.actions.appendChild(previewButton);
    }
  }

  hide(): void {
    this.root.hidden = true;
  }

  private getPrimaryLabel(
    action: string,
    fallback: string,
    price: number | null,
  ): string {
    switch (action) {
      case 'buy':
        return price !== null
          ? `Mua · ${price.toLocaleString('vi-VN')} Coins`
          : fallback;
      case 'equip':
        return 'Trang bị ngay';
      case 'unequip':
        return 'Tháo về mặc định';
      default:
        return fallback;
    }
  }
}
