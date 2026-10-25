export const EQUIP_SLOTS = [
  'slash',
  'background',
  'fruitSkin',
  'trail',
  'explosion',
  'soundPack',
  'theme',
] as const;

export type EquipSlot = (typeof EQUIP_SLOTS)[number];
export type ShopCategory = EquipSlot | 'upgrade';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type UpgradeId =
  | 'bonusCoins'
  | 'scoreBonus'
  | 'comboBonus'
  | 'luckyDrop'
  | 'comboWindow'
  | 'missShield';

export interface SlashEffectStyle {
  coreColor: number;
  edgeColor: number;
  glowColor: number;
  widthScale: number;
  lifetime: number;
  sparkColors: number[];
  sparkRate: number;
  rainbow: boolean;
}

export type BackgroundDecoration =
  | 'none'
  | 'garden'
  | 'sunset'
  | 'neon'
  | 'space'
  | 'candy'
  | 'aurora'
  | 'ocean'
  | 'volcano'
  | 'sakura';

export interface BackgroundStyle {
  topColor: string;
  bottomColor: string;
  horizonColor: string;
  dustColor: number;
  decoration: BackgroundDecoration;
}

export type FruitSkinPattern =
  | 'classic'
  | 'gold'
  | 'neon'
  | 'crystal'
  | 'candy'
  | 'galaxy'
  | 'emerald'
  | 'lava'
  | 'frost'
  | 'chrome';

export interface FruitSkinStyle {
  primaryColor: number;
  accentColor: number;
  roughness: number;
  metalness: number;
  emissiveIntensity: number;
  opacity: number;
  pattern: FruitSkinPattern;
}

export interface TrailStyle {
  colors: number[];
  intervalSeconds: number;
  lifeMin: number;
  lifeMax: number;
  sizeMin: number;
  sizeMax: number;
  gravityScale: number;
  drag: number;
  maxEmitters: number;
  rainbow: boolean;
}

export type ExplosionSoundVariant =
  | 'classic'
  | 'electric'
  | 'cosmic'
  | 'frost'
  | 'toxic'
  | 'royal';

export interface ExplosionStyle {
  flashColor: number;
  ringColors: number[];
  particleColors: number[];
  sparkColors: number[];
  particleCount: number;
  sparkCount: number;
  shakeStrength: number;
  shakeDuration: number;
  sound: ExplosionSoundVariant;
}

export interface SoundPackStyle {
  waveform: OscillatorType;
  pitch: number;
  spread: number;
  noiseStart: number;
  noiseEnd: number;
  previewColors: [number, number, number];
}

export interface ThemeStyle {
  vars: Record<string, string>;
}

interface ShopItemBase {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rarity: Rarity;
  readonly isDefault?: boolean;
}

export interface SlashShopItem extends ShopItemBase {
  readonly category: 'slash';
  readonly price: number;
  readonly style: SlashEffectStyle;
}

export interface BackgroundShopItem extends ShopItemBase {
  readonly category: 'background';
  readonly price: number;
  readonly style: BackgroundStyle;
}

export interface FruitSkinShopItem extends ShopItemBase {
  readonly category: 'fruitSkin';
  readonly price: number;
  readonly style: FruitSkinStyle;
}

export interface TrailShopItem extends ShopItemBase {
  readonly category: 'trail';
  readonly price: number;
  readonly style: TrailStyle;
}

export interface ExplosionShopItem extends ShopItemBase {
  readonly category: 'explosion';
  readonly price: number;
  readonly style: ExplosionStyle;
}

export interface SoundPackShopItem extends ShopItemBase {
  readonly category: 'soundPack';
  readonly price: number;
  readonly style: SoundPackStyle;
}

export interface ThemeShopItem extends ShopItemBase {
  readonly category: 'theme';
  readonly price: number;
  readonly style: ThemeStyle;
}

export interface UpgradeShopItem extends ShopItemBase {
  readonly category: 'upgrade';
  readonly upgradeId: UpgradeId;
}

export type CosmeticShopItem =
  | SlashShopItem
  | BackgroundShopItem
  | FruitSkinShopItem
  | TrailShopItem
  | ExplosionShopItem
  | SoundPackShopItem
  | ThemeShopItem;

export type EquippableShopItem = CosmeticShopItem;
export type ShopItem = CosmeticShopItem | UpgradeShopItem;

export type EquippedItems = Record<EquipSlot, string>;

export function isEquipSlot(category: ShopCategory): category is EquipSlot {
  return category !== 'upgrade';
}

export function isUpgradeItem(item: ShopItem): item is UpgradeShopItem {
  return item.category === 'upgrade';
}
