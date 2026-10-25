import type { ShopManager } from '../shop/ShopManager';
import { isUpgradeItem } from '../shop/ShopItem';
import type { ShopItem } from '../shop/ShopItem';
import { CATEGORY_LABELS, RARITY_LABELS, renderItemPreview } from './ItemPreview';
import { getShopItemState, type ShopItemState } from './ShopItemState';

export interface ShopCardHandlers {
  onSelect(itemId: string): void;
  onAction(itemId: string): void;
}

export interface ShopItemCardHandle {
  readonly element: HTMLElement;
  readonly item: ShopItem;
  /** Refreshes card state without rebuilding its DOM tree. */
  sync(shop: ShopManager, selected: boolean): void;
  setSelected(selected: boolean): void;
}

function formatPrice(price: number): string {
  return price.toLocaleString('vi-VN');
}

function createStateKey(state: ShopItemState): string {
  return [
    state.statusLabel,
    state.tone,
    state.action,
    state.actionLabel,
    state.actionEnabled ? '1' : '0',
    state.price ?? '',
    state.level ?? '',
    state.maxLevel ?? '',
  ].join('|');
}

export function createShopItemCard(
  item: ShopItem,
  selected: boolean,
  handlers: ShopCardHandlers,
): ShopItemCardHandle {
  const card = document.createElement('div');
  card.className = `shop-card rarity--${item.rarity}`;
  card.dataset.itemId = item.id;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${item.name}, ${RARITY_LABELS[item.rarity]}`);

  const previewWrap = document.createElement('div');
  previewWrap.className = 'shop-card__preview';
  const preview = document.createElement('div');
  preview.className = 'preview-surface';
  previewWrap.appendChild(preview);
  const rarity = document.createElement('span');
  rarity.className = `rarity rarity--${item.rarity}`;
  rarity.textContent = RARITY_LABELS[item.rarity];
  previewWrap.appendChild(rarity);
  const equipped = document.createElement('span');
  equipped.className = 'shop-card__equipped';
  equipped.textContent = 'Đang dùng';
  equipped.hidden = true;
  previewWrap.appendChild(equipped);
  card.appendChild(previewWrap);

  const body = document.createElement('div');
  body.className = 'shop-card__body';

  const category = document.createElement('p');
  category.className = 'shop-card__category';
  body.appendChild(category);

  const title = document.createElement('h3');
  title.className = 'shop-card__title';
  title.textContent = item.name;
  body.appendChild(title);

  const description = document.createElement('p');
  description.className = 'shop-card__desc';
  description.textContent = item.description;
  body.appendChild(description);

  const foot = document.createElement('div');
  foot.className = 'shop-card__foot';

  const stateChip = document.createElement('span');
  stateChip.className = 'shop-state';
  foot.appendChild(stateChip);

  const price = document.createElement('span');
  price.className = 'shop-card__price';
  const priceIcon = document.createElement('span');
  priceIcon.className = 'coin-icon coin-icon--small';
  priceIcon.setAttribute('aria-hidden', 'true');
  const priceValue = document.createElement('span');
  price.append(priceIcon, priceValue);
  foot.appendChild(price);

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'shop-card__action';
  action.addEventListener('click', (event) => {
    event.stopPropagation();
    handlers.onAction(item.id);
  });
  foot.appendChild(action);

  const maxed = document.createElement('span');
  maxed.className = 'shop-card__maxed';
  maxed.textContent = 'MAX';
  maxed.hidden = true;
  foot.appendChild(maxed);

  body.appendChild(foot);
  card.appendChild(body);

  card.addEventListener('click', () => {
    handlers.onSelect(item.id);
  });
  card.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLButtonElement) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlers.onSelect(item.id);
    }
  });

  let selectedState = false;
  let lastStateKey = '';
  let previewReady = false;
  let previewLevel = -1;
  let previewMaxLevel = -1;

  const setSelected = (nextSelected: boolean): void => {
    if (selectedState === nextSelected) {
      return;
    }
    selectedState = nextSelected;
    card.classList.toggle('is-selected', nextSelected);
    card.setAttribute('aria-pressed', String(nextSelected));
  };

  const sync = (shopManager: ShopManager, nextSelected: boolean): void => {
    setSelected(nextSelected);
    const state = getShopItemState(shopManager, item);

    const level = state.level ?? -1;
    const maxLevel = state.maxLevel ?? -1;
    if (
      !previewReady ||
      level !== previewLevel ||
      maxLevel !== previewMaxLevel
    ) {
      previewReady = true;
      previewLevel = level;
      previewMaxLevel = maxLevel;
      renderItemPreview(preview, item, state);
      category.textContent = isUpgradeItem(item)
        ? `${CATEGORY_LABELS.upgrade} · ${level}/${maxLevel}`
        : CATEGORY_LABELS[item.category];
    }

    const nextStateKey = createStateKey(state);
    if (nextStateKey === lastStateKey) {
      return;
    }
    lastStateKey = nextStateKey;

    stateChip.className = `shop-state shop-state--${state.tone}`;
    stateChip.textContent = state.statusLabel;
    equipped.hidden = state.tone !== 'equipped';

    const hasPrice = state.price !== null;
    price.hidden = !hasPrice;
    if (state.price !== null) {
      priceValue.textContent = formatPrice(state.price);
    }

    action.hidden = state.action === 'none';
    if (state.action !== 'none') {
      action.textContent = state.actionLabel;
      action.disabled = !state.actionEnabled;
    }

    maxed.hidden = !(isUpgradeItem(item) && state.tone === 'maxed');
  };

  setSelected(selected);

  return {
    element: card,
    item,
    sync,
    setSelected,
  };
}
