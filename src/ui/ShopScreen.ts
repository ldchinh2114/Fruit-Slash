import type { ShopManager, BuyResult } from '../shop/ShopManager';
import type { EquipOutcome } from '../shop/EquipmentManager';
import type { ShopCategory, ShopItem } from '../shop/ShopItem';
import {
  CATEGORY_TABS,
  SHOP_ITEMS,
  getItemsByCategory,
} from '../shop/ShopCatalog';
import { isUpgradeItem } from '../shop/ShopItem';
import { Screen } from './Screen';
import { CurrencyDisplay } from './CurrencyDisplay';
import { requireId } from './dom';
import {
  createShopItemCard,
  type ShopItemCardHandle,
} from './ShopItemCard';
import { ItemDetailsPanel } from './ItemDetailsPanel';
import { getShopItemState } from './ShopItemState';

export type ShopFeedback = 'purchase' | 'equip' | 'error' | 'ui' | 'preview';

export interface ShopScreenCallbacks {
  onClose(): void;
  onFeedback(kind: ShopFeedback): void;
  onPreviewSound(item: ShopItem): void;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export class ShopScreen extends Screen {
  private readonly tabs = requireId('shop-tabs');
  private readonly grid = requireId('shop-grid');
  private readonly count = requireId('shop-count');
  private readonly empty = requireId('shop-empty');
  private readonly search = requireId<HTMLInputElement>('shop-search');
  private readonly closeButton = requireId<HTMLButtonElement>('btn-shop-close');
  private readonly message = requireId('shop-message');
  private readonly details = new ItemDetailsPanel();
  private readonly balanceDisplay: CurrencyDisplay;
  private readonly cards = new Map<string, ShopItemCardHandle>();
  private readonly searchIndex = new Map<string, string>();
  private readonly itemCache = new Map<ShopCategory | 'all', ShopItem[]>();
  private activeCategory: ShopCategory | 'all' = 'all';
  private query = '';
  private selectedId: string | null = null;
  private messageTimer = 0;

  constructor(
    private readonly shop: ShopManager,
    private readonly callbacks: ShopScreenCallbacks,
  ) {
    super('screen-shop');
    this.balanceDisplay = new CurrencyDisplay(requireId('shop-coins'));
    this.closeButton.addEventListener('click', this.handleClose);
    this.search.addEventListener('input', this.handleSearch);
    this.tabs.addEventListener('click', this.handleTabClick);
    this.buildTabs();
  }

  /**
   * Builds every card once so switching tabs, searching and buying never
   * rebuilds the (large) shop DOM tree.
   */
  prewarm(): void {
    if (this.cards.size > 0) {
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const item of SHOP_ITEMS) {
      this.searchIndex.set(
        item.id,
        normalize(`${item.name} ${item.description}`),
      );
      const card = createShopItemCard(item, false, {
        onSelect: (itemId) => this.selectItem(itemId),
        onAction: (itemId) => this.handleAction(itemId),
      });
      card.element.hidden = true;
      card.sync(this.shop, false);
      this.cards.set(item.id, card);
      fragment.appendChild(card.element);
    }
    this.grid.appendChild(fragment);
  }

  show(): void {
    this.prewarm();
    this.activeCategory = 'all';
    this.query = '';
    this.search.value = '';
    this.selectedId = null;
    this.clearMessage();
    this.balanceDisplay.set(this.shop.balance, false);
    this.updateTabSelection();
    this.renderGrid();
    this.showRoot();
  }

  override hide(): void {
    this.clearMessage();
    super.hide();
  }

  destroy(): void {
    this.closeButton.removeEventListener('click', this.handleClose);
    this.search.removeEventListener('input', this.handleSearch);
    this.tabs.removeEventListener('click', this.handleTabClick);
    this.balanceDisplay.destroy();
    window.clearTimeout(this.messageTimer);
    this.cards.clear();
  }

  private buildTabs(): void {
    this.tabs.replaceChildren();
    for (const tab of CATEGORY_TABS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'shop-tab';
      button.dataset.category = tab.id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.textContent = tab.label;
      const count = document.createElement('span');
      count.className = 'shop-tab__count';
      count.textContent = String(this.getItems(tab.id).length);
      button.appendChild(count);
      this.tabs.appendChild(button);
    }
  }

  private getItems(category: ShopCategory | 'all'): ShopItem[] {
    const cached = this.itemCache.get(category);
    if (cached) {
      return cached;
    }
    let items: ShopItem[];
    if (category !== 'all') {
      items = [...getItemsByCategory(category)];
    } else {
      items = [];
      for (const tab of CATEGORY_TABS) {
        if (tab.id !== 'all') {
          items.push(...getItemsByCategory(tab.id));
        }
      }
    }
    this.itemCache.set(category, items);
    return items;
  }

  private getFilteredItems(): ShopItem[] {
    const items = this.getItems(this.activeCategory);
    const normalizedQuery = normalize(this.query.trim());
    if (!normalizedQuery) {
      return items;
    }
    return items.filter((item) => {
      const haystack = this.searchIndex.get(item.id) ?? '';
      return haystack.includes(normalizedQuery);
    });
  }

  private renderGrid(): void {
    const items = this.getFilteredItems();
    const visible = new Set(items.map((item) => item.id));

    let nextSelected = this.selectedId;
    if (nextSelected === null || !visible.has(nextSelected)) {
      nextSelected = items[0]?.id ?? null;
    }
    if (nextSelected !== this.selectedId) {
      const previous = this.selectedId;
      this.selectedId = nextSelected;
      if (previous) {
        this.cards.get(previous)?.setSelected(false);
      }
    }

    for (const [itemId, card] of this.cards) {
      const isVisible = visible.has(itemId);
      card.element.hidden = !isVisible;
      if (isVisible) {
        card.sync(this.shop, itemId === this.selectedId);
      }
    }

    this.empty.hidden = items.length > 0;
    this.count.textContent =
      items.length > 0
        ? `${items.length} vật phẩm`
        : 'Không có vật phẩm phù hợp';
    this.updateDetails();
  }

  /** Refreshes only mutable card fields after a purchase or equip. */
  private refreshState(): void {
    for (const [itemId, card] of this.cards) {
      if (!card.element.hidden) {
        card.sync(this.shop, itemId === this.selectedId);
      }
    }
    this.updateDetails();
  }

  private selectItem(itemId: string): void {
    if (this.selectedId === itemId) {
      return;
    }
    if (this.selectedId) {
      this.cards.get(this.selectedId)?.setSelected(false);
    }
    this.selectedId = itemId;
    this.cards.get(itemId)?.setSelected(true);
    this.updateDetails();
  }

  private updateDetails(): void {
    const item = this.selectedId
      ? this.shop.getItem(this.selectedId)
      : undefined;
    if (!item) {
      this.details.hide();
      return;
    }
    this.details.show(this.shop, item, {
      onAction: (itemId) => {
        this.handleAction(itemId);
      },
      onPreviewSound: (itemId) => {
        const previewItem = this.shop.getItem(itemId);
        if (previewItem?.category === 'soundPack') {
          this.callbacks.onPreviewSound(previewItem);
        }
      },
    });
  }

  private handleAction(itemId: string): void {
    const item = this.shop.getItem(itemId);
    if (!item) {
      this.showMessage('Không tìm thấy vật phẩm này.', 'error');
      this.callbacks.onFeedback('error');
      return;
    }
    const state = getShopItemState(this.shop, item);
    if (state.action === 'buy') {
      this.handleBuy(item);
    } else if (state.action === 'equip') {
      this.handleEquipResult(this.shop.equip(itemId), item);
    } else if (state.action === 'unequip' && !isUpgradeItem(item)) {
      this.handleEquipResult(this.shop.unequip(item.category), item);
    }
  }

  private handleBuy(item: ShopItem): void {
    const result = this.shop.buy(item.id);
    this.balanceDisplay.set(this.shop.balance);
    if (result.status === 'purchased') {
      this.showMessage(
        `Đã mua ${item.name} với ${result.price.toLocaleString('vi-VN')} Coins.`,
        'success',
      );
      this.callbacks.onFeedback('purchase');
    } else if (result.status === 'upgraded') {
      this.showMessage(
        `${item.name} đã đạt cấp ${result.level}/${this.shop.getUpgradeMaxLevel(result.item)}.`,
        'success',
      );
      this.callbacks.onFeedback('purchase');
    } else {
      this.showBuyError(result);
      this.callbacks.onFeedback('error');
    }
    this.refreshState();
  }

  private showBuyError(result: BuyResult): void {
    switch (result.status) {
      case 'insufficient':
        this.showMessage(
          `Không đủ Coins. Cần thêm ${result.missing.toLocaleString('vi-VN')} Coins.`,
          'error',
        );
        break;
      case 'owned':
        this.showMessage('Bạn đã sở hữu vật phẩm này.', 'error');
        break;
      case 'maxed':
        this.showMessage('Nâng cấp này đã đạt cấp tối đa.', 'error');
        break;
      case 'save-failed':
        this.showMessage(
          'Không thể lưu thay đổi. Coins chưa bị trừ, vui lòng thử lại.',
          'error',
        );
        break;
      case 'not-found':
        this.showMessage('Vật phẩm không còn tồn tại trong cửa hàng.', 'error');
        break;
      default:
        this.showMessage('Không thể hoàn tất giao dịch.', 'error');
        break;
    }
  }

  private handleEquipResult(outcome: EquipOutcome, item: ShopItem): void {
    switch (outcome.status) {
      case 'equipped':
        this.showMessage(`Đã trang bị ${item.name}.`, 'success');
        this.callbacks.onFeedback('equip');
        break;
      case 'already-equipped':
        this.showMessage('Vật phẩm này đang được trang bị.', 'success');
        this.callbacks.onFeedback('ui');
        break;
      case 'not-owned':
        this.showMessage(
          'Bạn cần mua vật phẩm này trước khi trang bị.',
          'error',
        );
        this.callbacks.onFeedback('error');
        break;
      case 'save-failed':
        this.showMessage(
          'Không thể lưu trang bị mới. Vui lòng thử lại.',
          'error',
        );
        this.callbacks.onFeedback('error');
        break;
      case 'not-found':
        this.showMessage('Không tìm thấy vật phẩm để trang bị.', 'error');
        this.callbacks.onFeedback('error');
        break;
    }
    this.refreshState();
  }

  private showMessage(text: string, tone: 'success' | 'error'): void {
    window.clearTimeout(this.messageTimer);
    this.message.textContent = text;
    this.message.className = `shop-message is-visible shop-message--${tone}`;
    this.messageTimer = window.setTimeout(() => {
      this.message.classList.remove('is-visible');
    }, 3400);
  }

  private clearMessage(): void {
    window.clearTimeout(this.messageTimer);
    this.messageTimer = 0;
    this.message.textContent = '';
    this.message.className = 'shop-message';
  }

  private updateTabSelection(): void {
    for (const button of this.tabs.querySelectorAll<HTMLButtonElement>(
      '.shop-tab',
    )) {
      const active = button.dataset.category === this.activeCategory;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    }
  }

  private readonly handleClose = (): void => {
    this.callbacks.onClose();
  };

  private readonly handleSearch = (): void => {
    this.query = this.search.value;
    this.renderGrid();
  };

  private readonly handleTabClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>('.shop-tab');
    const category = button?.dataset.category;
    if (!button || !category || category === this.activeCategory) {
      return;
    }
    this.activeCategory = category as ShopCategory | 'all';
    this.updateTabSelection();
    this.callbacks.onFeedback('ui');
    this.renderGrid();
  };
}
