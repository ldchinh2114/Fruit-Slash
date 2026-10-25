import type {
  BackgroundShopItem,
  ExplosionShopItem,
  FruitSkinShopItem,
  ShopCategory,
  ShopItem,
  SlashShopItem,
  SoundPackShopItem,
  ThemeShopItem,
  TrailShopItem,
  UpgradeShopItem,
} from '../shop/ShopItem';
import {
  isUpgradeItem,
} from '../shop/ShopItem';

export const CATEGORY_LABELS: Record<ShopCategory, string> = {
  slash: 'Hiệu ứng chém',
  background: 'Phông nền',
  fruitSkin: 'Trang phục trái cây',
  trail: 'Vệt bay',
  explosion: 'Hiệu ứng nổ',
  soundPack: 'Gói âm thanh',
  theme: 'Giao diện',
  upgrade: 'Nâng cấp',
};

export const RARITY_LABELS = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
} as const;

function hex(color: number): string {
  return `#${Math.max(0, Math.min(0xffffff, color)).toString(16).padStart(6, '0')}`;
}

function create(
  tag: keyof HTMLElementTagNameMap,
  className: string,
  text?: string,
): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

export function renderItemPreview(
  container: HTMLElement,
  item: ShopItem,
  options: { level?: number; maxLevel?: number } = {},
): void {
  container.replaceChildren();
  container.dataset.category = item.category;
  container.dataset.rarity = item.rarity;

  if (isUpgradeItem(item)) {
    renderUpgrade(container, item, options.level ?? 0, options.maxLevel ?? 5);
    return;
  }

  switch (item.category) {
    case 'slash':
      renderSlash(container, item);
      break;
    case 'background':
      renderBackground(container, item);
      break;
    case 'fruitSkin':
      renderFruitSkin(container, item);
      break;
    case 'trail':
      renderTrail(container, item);
      break;
    case 'explosion':
      renderExplosion(container, item);
      break;
    case 'soundPack':
      renderSoundPack(container, item);
      break;
    case 'theme':
      renderTheme(container, item);
      break;
  }
}

function renderSlash(container: HTMLElement, item: SlashShopItem): void {
  const stage = create('div', 'preview-slash');
  stage.style.setProperty('--slash-core', hex(item.style.coreColor));
  stage.style.setProperty('--slash-edge', hex(item.style.edgeColor));
  stage.style.setProperty('--slash-glow', hex(item.style.glowColor));
  stage.style.setProperty('--slash-width', String(item.style.widthScale));
  stage.style.setProperty('--slash-rainbow', item.style.rainbow ? '1' : '0');
  for (let index = 0; index < 3; index += 1) {
    const line = create('span', 'preview-slash__line');
    line.style.setProperty('--line-index', String(index));
    stage.appendChild(line);
  }
  for (let index = 0; index < 5; index += 1) {
    const spark = create('span', 'preview-slash__spark');
    spark.style.left = `${16 + index * 17}%`;
    spark.style.top = `${34 + (index % 3) * 14}%`;
    spark.style.background = hex(
      item.style.sparkColors[index % Math.max(1, item.style.sparkColors.length)] ?? item.style.edgeColor,
    );
    stage.appendChild(spark);
  }
  container.appendChild(stage);
}

function renderBackground(
  container: HTMLElement,
  item: BackgroundShopItem,
): void {
  const stage = create('div', 'preview-background');
  stage.style.background = `radial-gradient(circle at 50% 62%, ${item.style.horizonColor}66, transparent 58%), linear-gradient(180deg, ${item.style.topColor} 0%, ${item.style.bottomColor} 78%)`;
  const horizon = create('span', 'preview-background__horizon');
  horizon.style.background = `radial-gradient(ellipse at center, ${item.style.horizonColor}88, transparent 70%)`;
  stage.appendChild(horizon);
  if (item.style.decoration === 'neon') {
    stage.appendChild(create('span', 'preview-background__grid'));
  }
  if (item.style.decoration === 'space') {
    for (let index = 0; index < 14; index += 1) {
      const star = create('span', 'preview-background__star');
      star.style.left = `${8 + (index * 37) % 86}%`;
      star.style.top = `${8 + (index * 53) % 76}%`;
      stage.appendChild(star);
    }
  }
  if (item.style.decoration === 'aurora') {
    for (let index = 0; index < 3; index += 1) {
      const ribbon = create('span', 'preview-background__aurora');
      ribbon.style.left = `${4 + index * 12}%`;
      ribbon.style.top = `${6 + index * 5}%`;
      ribbon.style.transform = `rotate(${-16 + index * 7}deg)`;
      ribbon.style.background = `linear-gradient(90deg, transparent, ${item.style.horizonColor}${index === 1 ? 'dd' : '99'}, ${item.style.dustColor}88, transparent)`;
      stage.appendChild(ribbon);
    }
  }
  if (item.style.decoration === 'ocean') {
    for (let index = 0; index < 4; index += 1) {
      const ray = create('span', 'preview-background__ray');
      ray.style.left = `${22 + index * 18}%`;
      ray.style.transform = `rotate(${12 + index * 4}deg)`;
      ray.style.background = `linear-gradient(180deg, ${item.style.dustColor}88, transparent)`;
      stage.appendChild(ray);
    }
  }
  if (item.style.decoration === 'volcano') {
    const lava = create('span', 'preview-background__lava');
    lava.style.background = `linear-gradient(180deg, ${item.style.horizonColor}00, ${item.style.horizonColor}88 45%, ${item.style.dustColor}55)`;
    stage.appendChild(lava);
  }
  if (item.style.decoration === 'sakura') {
    const moon = create('span', 'preview-background__moon');
    moon.style.background = `radial-gradient(circle, ${item.style.dustColor} 0 34%, ${item.style.horizonColor}55 58%, transparent 72%)`;
    stage.appendChild(moon);
  }
  const dots =
    item.style.decoration === 'none'
      ? 0
      : item.style.decoration === 'volcano'
        ? 12
        : item.style.decoration === 'aurora' || item.style.decoration === 'sakura'
          ? 10
          : 7;
  for (let index = 0; index < dots; index += 1) {
    const dot = create('span', 'preview-background__dot');
    dot.style.left = `${10 + (index * 29) % 80}%`;
    dot.style.top = `${24 + (index * 41) % 60}%`;
    dot.style.background = hex(item.style.dustColor);
    stage.appendChild(dot);
  }
  container.appendChild(stage);
}

function renderFruitSkin(
  container: HTMLElement,
  item: FruitSkinShopItem,
): void {
  const stage = create('div', 'preview-fruit-stage');
  stage.dataset.pattern = item.style.pattern;
  const fruit = create('span', 'preview-fruit');
  fruit.style.background = `radial-gradient(circle at 32% 28%, ${hex(item.style.accentColor)} 0%, ${hex(item.style.primaryColor)} 62%, rgba(0,0,0,0.28) 100%)`;
  fruit.style.opacity = String(Math.max(0.55, item.style.opacity));
  fruit.style.boxShadow = `0 18px 32px rgba(0,0,0,0.35), 0 0 38px ${hex(item.style.accentColor)}44`;
  stage.appendChild(fruit);
  const leaf = create('span', 'preview-fruit__leaf');
  stage.appendChild(leaf);
  container.appendChild(stage);
}

function renderTrail(container: HTMLElement, item: TrailShopItem): void {
  const stage = create('div', 'preview-trail');
  const colors = item.style.colors;
  if (colors.length === 0) {
    stage.classList.add('is-empty');
    stage.appendChild(create('span', 'preview-trail__off', 'Không có vệt bay'));
    container.appendChild(stage);
    return;
  }
  stage.style.setProperty('--trail-rainbow', item.style.rainbow ? '1' : '0');
  for (let index = 0; index < 9; index += 1) {
    const dot = create('span', 'preview-trail__dot');
    dot.style.left = `${8 + index * 9.5}%`;
    dot.style.top = `${58 - Math.sin(index / 8 * Math.PI) * 26}%`;
    const color = item.style.rainbow
      ? `hsl(${Math.round(index / 9 * 320)}, 95%, 65%)`
      : hex(colors[index % colors.length]);
    dot.style.background = color;
    dot.style.boxShadow = `0 0 12px ${color}`;
    dot.style.opacity = String(0.4 + index / 15);
    dot.style.width = `${Math.max(5, Math.min(16, item.style.sizeMax * 26))}px`;
    dot.style.height = dot.style.width;
    stage.appendChild(dot);
  }
  container.appendChild(stage);
}

function renderExplosion(
  container: HTMLElement,
  item: ExplosionShopItem,
): void {
  const stage = create('div', 'preview-explosion');
  const rings = item.style.ringColors;
  stage.style.setProperty('--burst-flash', hex(item.style.flashColor));
  stage.style.setProperty('--burst-ring-a', hex(rings[0] ?? item.style.flashColor));
  stage.style.setProperty('--burst-ring-b', hex(rings[1] ?? item.style.flashColor));
  const core = create('span', 'preview-explosion__core');
  core.style.background = hex(item.style.flashColor);
  stage.appendChild(core);
  const ringA = create('span', 'preview-explosion__ring preview-explosion__ring--a');
  const ringB = create('span', 'preview-explosion__ring preview-explosion__ring--b');
  stage.appendChild(ringA);
  stage.appendChild(ringB);
  for (let index = 0; index < 10; index += 1) {
    const shard = create('span', 'preview-explosion__shard');
    const angle = (index / 10) * Math.PI * 2;
    shard.style.left = `${50 + Math.cos(angle) * 36}%`;
    shard.style.top = `${50 + Math.sin(angle) * 36}%`;
    shard.style.background = hex(
      item.style.particleColors[index % Math.max(1, item.style.particleColors.length)] ?? item.style.flashColor,
    );
    stage.appendChild(shard);
  }
  container.appendChild(stage);
}

function renderSoundPack(
  container: HTMLElement,
  item: SoundPackShopItem,
): void {
  const stage = create('div', 'preview-sound');
  for (let index = 0; index < 9; index += 1) {
    const bar = create('span', 'preview-sound__bar');
    const wave = Math.abs(Math.sin(index * 0.9 + item.style.spread));
    bar.style.height = `${22 + wave * 58}%`;
    bar.style.background = hex(item.style.previewColors[index % item.style.previewColors.length]);
    stage.appendChild(bar);
  }
  container.appendChild(stage);
}

function renderTheme(container: HTMLElement, item: ThemeShopItem): void {
  const stage = create('div', 'preview-theme');
  const vars = item.style.vars;
  for (const [name, value] of Object.entries(vars)) {
    if (!name.startsWith('--')) {
      continue;
    }
    const swatch = create('span', 'preview-theme__swatch');
    swatch.style.background = value;
    swatch.title = name;
    stage.appendChild(swatch);
  }
  const bar = create('span', 'preview-theme__bar');
  bar.style.background = vars['--cyan'] ?? '#7ee8fa';
  stage.appendChild(bar);
  const barTwo = create('span', 'preview-theme__bar preview-theme__bar--two');
  barTwo.style.background = vars['--amber'] ?? '#ffd166';
  stage.appendChild(barTwo);
  container.appendChild(stage);
}

function renderUpgrade(
  container: HTMLElement,
  item: UpgradeShopItem,
  level: number,
  maxLevel: number,
): void {
  const stage = create('div', 'preview-upgrade');
  const icon = create('span', 'preview-upgrade__icon');
  switch (item.upgradeId) {
    case 'bonusCoins':
      icon.textContent = '◉';
      break;
    case 'scoreBonus':
      icon.textContent = '★';
      break;
    case 'comboBonus':
      icon.textContent = '×3';
      break;
    case 'luckyDrop':
      icon.textContent = '✦';
      break;
    case 'comboWindow':
      icon.textContent = '◷';
      break;
    case 'missShield':
      icon.textContent = '◇';
      break;
  }
  stage.appendChild(icon);
  const pips = create('div', 'preview-upgrade__pips');
  for (let index = 0; index < maxLevel; index += 1) {
    const pip = create('span', 'preview-upgrade__pip');
    if (index < level) {
      pip.classList.add('is-filled');
    }
    pips.appendChild(pip);
  }
  stage.appendChild(pips);
  container.appendChild(stage);
}
