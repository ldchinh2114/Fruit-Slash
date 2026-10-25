import type {
  CosmeticShopItem,
  EquippableShopItem,
  EquipSlot,
  EquippedItems,
  ShopCategory,
  ShopItem,
  UpgradeShopItem,
} from './ShopItem';
import { isEquipSlot } from './ShopItem';

export const DEFAULT_EQUIPPED: EquippedItems = {
  slash: 'slash-classic',
  background: 'background-garden',
  fruitSkin: 'fruit-skin-classic',
  trail: 'trail-none',
  explosion: 'explosion-classic',
  soundPack: 'sound-classic',
  theme: 'theme-classic',
};

export const CATEGORY_TABS: readonly {
  id: ShopCategory | 'all';
  label: string;
}[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'slash', label: 'Hiệu ứng chém' },
  { id: 'background', label: 'Phông nền' },
  { id: 'fruitSkin', label: 'Trái cây' },
  { id: 'trail', label: 'Vệt bay' },
  { id: 'explosion', label: 'Nổ bom' },
  { id: 'soundPack', label: 'Âm thanh' },
  { id: 'theme', label: 'Giao diện' },
  { id: 'upgrade', label: 'Nâng cấp' },
];

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'slash-classic',
    name: 'Classic Blue',
    description:
      'Đường chém xanh dương quen thuộc với lõi sáng trắng, gọn và dễ đọc trong mọi tình huống.',
    category: 'slash',
    rarity: 'common',
    price: 0,
    isDefault: true,
    style: {
      coreColor: 0xf2feff,
      edgeColor: 0x35c9ff,
      glowColor: 0x58d7ff,
      widthScale: 1,
      lifetime: 0.24,
      sparkColors: [0xbdefff, 0x7ee8fa, 0xffffff],
      sparkRate: 10,
      rainbow: false,
    },
  },
  {
    id: 'slash-fire',
    name: 'Fire Slash',
    description:
      'Vệt chém bùng cháy với quầng cam đỏ, tóe than hồng phía sau mỗi nhát cắt.',
    category: 'slash',
    rarity: 'rare',
    price: 600,
    style: {
      coreColor: 0xfff1b8,
      edgeColor: 0xff5a1f,
      glowColor: 0xff8a2a,
      widthScale: 1.08,
      lifetime: 0.3,
      sparkColors: [0xffd166, 0xff7a1a, 0xff3b1f, 0xffffff],
      sparkRate: 30,
      rainbow: false,
    },
  },
  {
    id: 'slash-electric',
    name: 'Electric Slash',
    description:
      'Tia điện xanh tím giật sáng dọc đường vuốt, kèm tia lửa điện li ti.',
    category: 'slash',
    rarity: 'rare',
    price: 850,
    style: {
      coreColor: 0xf0e6ff,
      edgeColor: 0x8b5cf6,
      glowColor: 0x38bdf8,
      widthScale: 0.94,
      lifetime: 0.22,
      sparkColors: [0xc4b5fd, 0x7dd3fc, 0xffffff],
      sparkRate: 34,
      rainbow: false,
    },
  },
  {
    id: 'slash-rainbow',
    name: 'Rainbow Slash',
    description:
      'Dải cầu vồng chuyển màu liên tục, để lại chuỗi hạt sáng rực rỡ.',
    category: 'slash',
    rarity: 'epic',
    price: 1100,
    style: {
      coreColor: 0xffffff,
      edgeColor: 0xff4fd8,
      glowColor: 0x7ee8fa,
      widthScale: 1.12,
      lifetime: 0.32,
      sparkColors: [
        0xff4d6d,
        0xffb703,
        0x7ef0a5,
        0x7ee8fa,
        0x9b7bff,
      ],
      sparkRate: 24,
      rainbow: true,
    },
  },
  {
    id: 'slash-neon',
    name: 'Neon Slash',
    description:
      'Lõi trắng phát sáng viền hồng - xanh neon, nổi bật trên mọi phông nền.',
    category: 'slash',
    rarity: 'epic',
    price: 1300,
    style: {
      coreColor: 0xffffff,
      edgeColor: 0xff2bd6,
      glowColor: 0x00f0ff,
      widthScale: 1.2,
      lifetime: 0.28,
      sparkColors: [0xff2bd6, 0x00f0ff, 0xffffff],
      sparkRate: 28,
      rainbow: false,
    },
  },
  {
    id: 'slash-golden',
    name: 'Golden Slash',
    description:
      'Đường chém vàng lấp lánh với lượng hạt sáng dày, dành cho người thích phô trương.',
    category: 'slash',
    rarity: 'legendary',
    price: 1500,
    style: {
      coreColor: 0xfff8d0,
      edgeColor: 0xffb703,
      glowColor: 0xffd166,
      widthScale: 1.1,
      lifetime: 0.3,
      sparkColors: [0xffe28a, 0xffc93c, 0xfff8d0],
      sparkRate: 38,
      rainbow: false,
    },
  },

  {
    id: 'slash-frost',
    name: 'Frost Slash',
    description:
      'Đường chém băng giá trắng xanh với tinh thể lấp lánh, tạo cảm giác lạnh buốt sau mỗi nhát cắt.',
    category: 'slash',
    rarity: 'rare',
    price: 700,
    style: {
      coreColor: 0xf5ffff,
      edgeColor: 0x66d9ff,
      glowColor: 0xbdefff,
      widthScale: 1.04,
      lifetime: 0.26,
      sparkColors: [0xffffff, 0x9be7ff, 0x66d9ff],
      sparkRate: 26,
      rainbow: false,
    },
  },
  {
    id: 'slash-toxic',
    name: 'Toxic Slash',
    description:
      'Vệt chém axit xanh độc với quầng sáng neon và chuỗi hạt bắn tung tóe đầy uy lực.',
    category: 'slash',
    rarity: 'epic',
    price: 1200,
    style: {
      coreColor: 0xf4ffb8,
      edgeColor: 0x84cc16,
      glowColor: 0x22c55e,
      widthScale: 1.06,
      lifetime: 0.3,
      sparkColors: [0xd9f99d, 0x86efac, 0x22c55e, 0xffffff],
      sparkRate: 30,
      rainbow: false,
    },
  },
  {
    id: 'slash-sakura',
    name: 'Sakura Slash',
    description:
      'Sắc hồng cánh hoa mềm mại, kèm những hạt sáng phớt hồng trôi chậm theo đường vuốt.',
    category: 'slash',
    rarity: 'epic',
    price: 1350,
    style: {
      coreColor: 0xfff0f6,
      edgeColor: 0xff8fb8,
      glowColor: 0xff5d9e,
      widthScale: 1,
      lifetime: 0.34,
      sparkColors: [0xffc2d9, 0xff8fb8, 0xffffff],
      sparkRate: 26,
      rainbow: false,
    },
  },
  {
    id: 'slash-void',
    name: 'Void Slash',
    description:
      'Một nhát cắt xé toạc không gian: lõi tím nhạt, viền tối và tia sáng vũ trụ bùng nổ.',
    category: 'slash',
    rarity: 'legendary',
    price: 1900,
    style: {
      coreColor: 0xe9d5ff,
      edgeColor: 0x6d28d9,
      glowColor: 0x9b7bff,
      widthScale: 1.14,
      lifetime: 0.36,
      sparkColors: [0x4c1d95, 0xa78bfa, 0x1e1b4b, 0xffffff],
      sparkRate: 32,
      rainbow: false,
    },
  },

  {
    id: 'background-garden',
    name: 'Classic Garden',
    description:
      'Khu vườn xanh mát với đốm sáng bay lơ lửng. Tĩnh lặng, dễ nhìn và giữ độ tương phản tốt.',
    category: 'background',
    rarity: 'common',
    price: 0,
    isDefault: true,
    style: {
      topColor: '#5fae70',
      bottomColor: '#0f2317',
      horizonColor: '#b8f5a8',
      dustColor: 0xffe6bd,
      decoration: 'garden',
    },
  },
  {
    id: 'background-sunset',
    name: 'Sunset',
    description:
      'Hoàng hôn cam tím với mặt trời lớn phía xa, tạo khung nền ấm áp cho từng nhát chém.',
    category: 'background',
    rarity: 'rare',
    price: 700,
    style: {
      topColor: '#ff9a6b',
      bottomColor: '#321338',
      horizonColor: '#ffd166',
      dustColor: 0xffc6a0,
      decoration: 'sunset',
    },
  },
  {
    id: 'background-neon-city',
    name: 'Neon City',
    description:
      'Thành phố neon về đêm với lưới sáng hồng và xanh, phông tối giúp trái cây nổi bật.',
    category: 'background',
    rarity: 'epic',
    price: 1400,
    style: {
      topColor: '#101736',
      bottomColor: '#05060f',
      horizonColor: '#ff2bd6',
      dustColor: 0x9df6ff,
      decoration: 'neon',
    },
  },
  {
    id: 'background-space',
    name: 'Space',
    description:
      'Không gian vũ trụ sâu thẳm, sao lấp lánh và tinh vân tím giữ hậu cảnh luôn tối.',
    category: 'background',
    rarity: 'epic',
    price: 1700,
    style: {
      topColor: '#0a1033',
      bottomColor: '#02030c',
      horizonColor: '#8b5cf6',
      dustColor: 0xd7ddff,
      decoration: 'space',
    },
  },
  {
    id: 'background-candy',
    name: 'Candy World',
    description:
      'Thế giới kẹo pastel với chấm tròn ngọt ngào. Phần nền dưới vẫn được làm tối để giữ rõ vật thể.',
    category: 'background',
    rarity: 'legendary',
    price: 2000,
    style: {
      topColor: '#ffbde2',
      bottomColor: '#3b1338',
      horizonColor: '#ffe066',
      dustColor: 0xffe3f6,
      decoration: 'candy',
    },
  },

  {
    id: 'background-ocean',
    name: 'Deep Ocean',
    description:
      'Đại dương sâu thẳm với tia sáng xuyên nước và bong bóng lơ lửng, hậu cảnh xanh mát và tương phản tốt.',
    category: 'background',
    rarity: 'rare',
    price: 950,
    style: {
      topColor: '#0369a1',
      bottomColor: '#020617',
      horizonColor: '#22d3ee',
      dustColor: 0xcffafe,
      decoration: 'ocean',
    },
  },
  {
    id: 'background-aurora',
    name: 'Aurora',
    description:
      'Cực quang xanh ngọc và tím trải dài trên bầu trời đêm, kèm muôn vì sao lấp lánh phía sau.',
    category: 'background',
    rarity: 'epic',
    price: 1600,
    style: {
      topColor: '#052e2b',
      bottomColor: '#020617',
      horizonColor: '#5eead4',
      dustColor: 0xa7f3d0,
      decoration: 'aurora',
    },
  },
  {
    id: 'background-sakura',
    name: 'Sakura Night',
    description:
      'Đêm hoa anh đào dưới ánh trăng hồng, cánh hoa bay nhẹ trên nền trời tím thẫm.',
    category: 'background',
    rarity: 'epic',
    price: 1750,
    style: {
      topColor: '#3b1d3f',
      bottomColor: '#100614',
      horizonColor: '#ff8fb8',
      dustColor: 0xffc2d9,
      decoration: 'sakura',
    },
  },
  {
    id: 'background-volcano',
    name: 'Volcano',
    description:
      'Miệng núi lửa rực cháy với than hồng bốc lên và dung nham đỏ cam ở đường chân trời.',
    category: 'background',
    rarity: 'legendary',
    price: 2300,
    style: {
      topColor: '#7f1d1d',
      bottomColor: '#0c0505',
      horizonColor: '#f97316',
      dustColor: 0xfca5a5,
      decoration: 'volcano',
    },
  },

  {
    id: 'fruit-skin-classic',
    name: 'Classic Mix',
    description:
      'Bộ màu trái cây gốc. Giữ nguyên vân dưa hấu, kiwi và toàn bộ hình dạng ban đầu.',
    category: 'fruitSkin',
    rarity: 'common',
    price: 0,
    isDefault: true,
    style: {
      primaryColor: 0xffffff,
      accentColor: 0xffffff,
      roughness: 0.5,
      metalness: 0.02,
      emissiveIntensity: 0,
      opacity: 1,
      pattern: 'classic',
    },
  },
  {
    id: 'fruit-skin-golden',
    name: 'Golden Fruits',
    description:
      'Phủ lớp vàng kim loại bóng bẩy lên mọi loại trái cây. Hình dáng và hitbox không thay đổi.',
    category: 'fruitSkin',
    rarity: 'rare',
    price: 900,
    style: {
      primaryColor: 0xffc93c,
      accentColor: 0xfff3b0,
      roughness: 0.22,
      metalness: 0.85,
      emissiveIntensity: 0.22,
      opacity: 1,
      pattern: 'gold',
    },
  },
  {
    id: 'fruit-skin-neon',
    name: 'Neon Fruits',
    description:
      'Trái cây phát sáng cyan và hồng, men theo từng đường cong. Vẫn dễ nhận diện nhờ hình khối gốc.',
    category: 'fruitSkin',
    rarity: 'rare',
    price: 1200,
    style: {
      primaryColor: 0x00e5ff,
      accentColor: 0xff2bd6,
      roughness: 0.3,
      metalness: 0.25,
      emissiveIntensity: 0.65,
      opacity: 1,
      pattern: 'neon',
    },
  },
  {
    id: 'fruit-skin-crystal',
    name: 'Crystal Fruits',
    description:
      'Bề mặt pha lê nhiều mặt cắt, hơi trong suốt và bắt sáng. Không ảnh hưởng điểm hay hitbox.',
    category: 'fruitSkin',
    rarity: 'epic',
    price: 1600,
    style: {
      primaryColor: 0x9be7ff,
      accentColor: 0xffffff,
      roughness: 0.05,
      metalness: 0.38,
      emissiveIntensity: 0.2,
      opacity: 0.9,
      pattern: 'crystal',
    },
  },
  {
    id: 'fruit-skin-candy',
    name: 'Candy Fruits',
    description:
      'Lớp kẹo hồng ngọt với sọc xoáy và độ bóng mềm, giữ nguyên mọi loại quả.',
    category: 'fruitSkin',
    rarity: 'epic',
    price: 2000,
    style: {
      primaryColor: 0xff8fc7,
      accentColor: 0xfff1a8,
      roughness: 0.25,
      metalness: 0.05,
      emissiveIntensity: 0.2,
      opacity: 1,
      pattern: 'candy',
    },
  },
  {
    id: 'fruit-skin-galaxy',
    name: 'Galaxy Fruits',
    description:
      'Vũ trụ thu nhỏ trong từng quả: nền tím sâu, đốm sao và tinh vân phát sáng nhẹ.',
    category: 'fruitSkin',
    rarity: 'legendary',
    price: 2500,
    style: {
      primaryColor: 0x2a1a5e,
      accentColor: 0x9b7bff,
      roughness: 0.35,
      metalness: 0.5,
      emissiveIntensity: 0.55,
      opacity: 1,
      pattern: 'galaxy',
    },
  },

  {
    id: 'fruit-skin-emerald',
    name: 'Emerald Fruits',
    description:
      'Bề mặt ngọc lục bảo nhiều mặt cắt, bóng loáng và phản chiếu ánh sáng xanh lục.',
    category: 'fruitSkin',
    rarity: 'rare',
    price: 1000,
    style: {
      primaryColor: 0x0f766e,
      accentColor: 0xa7f3d0,
      roughness: 0.18,
      metalness: 0.65,
      emissiveIntensity: 0.18,
      opacity: 1,
      pattern: 'emerald',
    },
  },
  {
    id: 'fruit-skin-frost',
    name: 'Frost Fruits',
    description:
      'Lớp băng tuyết phủ kín từng quả với tinh thể trắng xanh, hơi trong suốt và bắt sáng.',
    category: 'fruitSkin',
    rarity: 'epic',
    price: 1600,
    style: {
      primaryColor: 0xbfeaff,
      accentColor: 0xffffff,
      roughness: 0.12,
      metalness: 0.25,
      emissiveIntensity: 0.3,
      opacity: 0.94,
      pattern: 'frost',
    },
  },
  {
    id: 'fruit-skin-lava',
    name: 'Lava Fruits',
    description:
      'Vỏ đá núi lửa nứt nẻ với dung nham cam rực cháy bên trong, phát sáng nhẹ trong bóng tối.',
    category: 'fruitSkin',
    rarity: 'epic',
    price: 1750,
    style: {
      primaryColor: 0x7f1d1d,
      accentColor: 0xff8a2a,
      roughness: 0.55,
      metalness: 0.1,
      emissiveIntensity: 0.75,
      opacity: 1,
      pattern: 'lava',
    },
  },
  {
    id: 'fruit-skin-chrome',
    name: 'Chrome Fruits',
    description:
      'Kim loại đánh bóng gương với dải phản chiếu trắng bạc, sắc lạnh và cực kỳ nổi bật.',
    category: 'fruitSkin',
    rarity: 'legendary',
    price: 2800,
    style: {
      primaryColor: 0x9ca3af,
      accentColor: 0xffffff,
      roughness: 0.08,
      metalness: 0.95,
      emissiveIntensity: 0.08,
      opacity: 1,
      pattern: 'chrome',
    },
  },

  {
    id: 'trail-none',
    name: 'No Trail',
    description:
      'Tắt hoàn toàn vệt bay để giữ màn hình sạch nhất. Đây là lựa chọn mặc định.',
    category: 'trail',
    rarity: 'common',
    price: 0,
    isDefault: true,
    style: {
      colors: [],
      intervalSeconds: 0.1,
      lifeMin: 0.2,
      lifeMax: 0.3,
      sizeMin: 0.1,
      sizeMax: 0.15,
      gravityScale: 0.2,
      drag: 1,
      maxEmitters: 0,
      rainbow: false,
    },
  },
  {
    id: 'trail-spark',
    name: 'Spark Trail',
    description:
      'Hạt lửa nhỏ li ti bay theo trái cây và bom, dày vừa phải để không che khuất vật thể.',
    category: 'trail',
    rarity: 'rare',
    price: 300,
    style: {
      colors: [0xffd166, 0xff8a3d, 0xfff6d0],
      intervalSeconds: 0.06,
      lifeMin: 0.35,
      lifeMax: 0.55,
      sizeMin: 0.12,
      sizeMax: 0.22,
      gravityScale: 0.5,
      drag: 1.2,
      maxEmitters: 4,
      rainbow: false,
    },
  },
  {
    id: 'trail-star',
    name: 'Star Trail',
    description:
      'Những vì sao nhỏ lấp lánh trôi chậm phía sau mỗi vật thể, giới hạn số hạt để giữ hiệu năng.',
    category: 'trail',
    rarity: 'rare',
    price: 600,
    style: {
      colors: [0xfff3a1, 0x9be7ff, 0xffffff],
      intervalSeconds: 0.08,
      lifeMin: 0.5,
      lifeMax: 0.8,
      sizeMin: 0.1,
      sizeMax: 0.2,
      gravityScale: 0.05,
      drag: 2.5,
      maxEmitters: 3,
      rainbow: false,
    },
  },
  {
    id: 'trail-smoke',
    name: 'Smoke Trail',
    description:
      'Làn khói mờ tím nhạt cuộn phía sau vật thể, tan dần và không làm rối đường bay.',
    category: 'trail',
    rarity: 'common',
    price: 450,
    style: {
      colors: [0x9ca3af, 0x6b7280, 0xd1d5db],
      intervalSeconds: 0.08,
      lifeMin: 0.6,
      lifeMax: 0.9,
      sizeMin: 0.25,
      sizeMax: 0.45,
      gravityScale: -0.08,
      drag: 1.4,
      maxEmitters: 3,
      rainbow: false,
    },
  },
  {
    id: 'trail-rainbow',
    name: 'Rainbow Trail',
    description:
      'Chuỗi hạt cầu vồng đổi màu liên tục theo vật thể, nổi bật nhưng vẫn có giới hạn hạt.',
    category: 'trail',
    rarity: 'epic',
    price: 1200,
    style: {
      colors: [
        0xff4d6d,
        0xffb703,
        0x7ef0a5,
        0x7ee8fa,
        0x9b7bff,
        0xff5d7d,
      ],
      intervalSeconds: 0.05,
      lifeMin: 0.4,
      lifeMax: 0.7,
      sizeMin: 0.12,
      sizeMax: 0.24,
      gravityScale: 0.3,
      drag: 1,
      maxEmitters: 4,
      rainbow: true,
    },
  },

  {
    id: 'trail-bubble',
    name: 'Bubble Trail',
    description:
      'Chuỗi bong bóng xanh nhạt nhẹ nhàng bay lên phía sau mỗi vật thể, tan dần trong không khí.',
    category: 'trail',
    rarity: 'rare',
    price: 500,
    style: {
      colors: [0x7ee8fa, 0xbfdbfe, 0xffffff],
      intervalSeconds: 0.09,
      lifeMin: 0.5,
      lifeMax: 0.85,
      sizeMin: 0.16,
      sizeMax: 0.32,
      gravityScale: -0.25,
      drag: 1.6,
      maxEmitters: 3,
      rainbow: false,
    },
  },
  {
    id: 'trail-snow',
    name: 'Snow Trail',
    description:
      'Bụi tuyết trắng xanh lất phất theo sau vật thể, nhẹ và không che khuất đường bay.',
    category: 'trail',
    rarity: 'rare',
    price: 650,
    style: {
      colors: [0xffffff, 0xdbeafe, 0x9be7ff],
      intervalSeconds: 0.07,
      lifeMin: 0.55,
      lifeMax: 0.9,
      sizeMin: 0.1,
      sizeMax: 0.2,
      gravityScale: 0.05,
      drag: 1.4,
      maxEmitters: 4,
      rainbow: false,
    },
  },
  {
    id: 'trail-petal',
    name: 'Petal Trail',
    description:
      'Cánh hoa anh đào hồng phấn bay lượn phía sau trái cây, mềm mại và thơ mộng.',
    category: 'trail',
    rarity: 'epic',
    price: 1100,
    style: {
      colors: [0xffc2d9, 0xff8fb8, 0xfff0f6],
      intervalSeconds: 0.06,
      lifeMin: 0.6,
      lifeMax: 0.9,
      sizeMin: 0.12,
      sizeMax: 0.24,
      gravityScale: -0.1,
      drag: 1.8,
      maxEmitters: 4,
      rainbow: false,
    },
  },
  {
    id: 'trail-void',
    name: 'Void Trail',
    description:
      'Dấu vết tím đen của không gian bị xé rách, kèm những đốm sáng vũ trụ mờ ảo.',
    category: 'trail',
    rarity: 'legendary',
    price: 1500,
    style: {
      colors: [0x4c1d95, 0x9b7bff, 0x1e1b4b],
      intervalSeconds: 0.05,
      lifeMin: 0.45,
      lifeMax: 0.8,
      sizeMin: 0.14,
      sizeMax: 0.3,
      gravityScale: 0.2,
      drag: 1.1,
      maxEmitters: 4,
      rainbow: false,
    },
  },

  {
    id: 'explosion-classic',
    name: 'Classic Explosion',
    description:
      'Vụ nổ cam đỏ quen thuộc với vòng xung lực kép. Sát thương giữ nguyên: một trái tim.',
    category: 'explosion',
    rarity: 'common',
    price: 0,
    isDefault: true,
    style: {
      flashColor: 0xffa347,
      ringColors: [0xffd166, 0xff5d3b],
      particleColors: [0xffdd7a, 0xff9a3c, 0xff5533, 0xffffff],
      sparkColors: [0xffe9b0],
      particleCount: 38,
      sparkCount: 14,
      shakeStrength: 0.5,
      shakeDuration: 0.55,
      sound: 'classic',
    },
  },
  {
    id: 'explosion-electric',
    name: 'Electric Explosion',
    description:
      'Vụ nổ xung điện xanh tím với tia sét tỏa ra. Chỉ đổi hình ảnh, âm thanh và hạt.',
    category: 'explosion',
    rarity: 'epic',
    price: 900,
    style: {
      flashColor: 0x9b8cff,
      ringColors: [0x7dd3fc, 0xa78bfa],
      particleColors: [0xbfdbfe, 0x8b5cf6, 0x38bdf8, 0xffffff],
      sparkColors: [0xe0f2ff, 0xc4b5fd],
      particleCount: 44,
      sparkCount: 20,
      shakeStrength: 0.55,
      shakeDuration: 0.6,
      sound: 'electric',
    },
  },
  {
    id: 'explosion-cosmic',
    name: 'Cosmic Explosion',
    description:
      'Vụ nổ vũ trụ hồng tím với vòng tinh vân rộng. Vẫn chỉ mất đúng một trái tim.',
    category: 'explosion',
    rarity: 'legendary',
    price: 1800,
    style: {
      flashColor: 0xff7ad9,
      ringColors: [0x8b5cf6, 0xff4ecd],
      particleColors: [0xffd1f7, 0xa78bfa, 0x38bdf8, 0xffffff],
      sparkColors: [0xfff0ff, 0x9b7bff],
      particleCount: 52,
      sparkCount: 24,
      shakeStrength: 0.62,
      shakeDuration: 0.7,
      sound: 'cosmic',
    },
  },

  {
    id: 'explosion-frost',
    name: 'Frost Explosion',
    description:
      'Vụ nổ băng giá với vòng xung lực trắng xanh và mảnh tinh thể bắn tung ra. Vẫn chỉ mất một trái tim.',
    category: 'explosion',
    rarity: 'epic',
    price: 1100,
    style: {
      flashColor: 0xcffafe,
      ringColors: [0x9be7ff, 0xffffff],
      particleColors: [0xbfefff, 0x7ee8fa, 0xffffff, 0xdbeafe],
      sparkColors: [0xffffff, 0xbfefff],
      particleCount: 46,
      sparkCount: 20,
      shakeStrength: 0.55,
      shakeDuration: 0.6,
      sound: 'frost',
    },
  },
  {
    id: 'explosion-toxic',
    name: 'Toxic Explosion',
    description:
      'Quả bom phát nổ thành đám mây axit xanh độc với các giọt sáng bắn ra tứ phía.',
    category: 'explosion',
    rarity: 'epic',
    price: 1250,
    style: {
      flashColor: 0xa3e635,
      ringColors: [0x22c55e, 0xd9f99d],
      particleColors: [0xd9f99d, 0x84cc16, 0x22c55e, 0xffffff],
      sparkColors: [0xf7fee7],
      particleCount: 46,
      sparkCount: 20,
      shakeStrength: 0.5,
      shakeDuration: 0.6,
      sound: 'toxic',
    },
  },
  {
    id: 'explosion-royal',
    name: 'Royal Explosion',
    description:
      'Vụ nổ hoàng gia với ánh vàng rực rỡ, vòng xung lực kép và tiếng nổ vang như một chiến thắng.',
    category: 'explosion',
    rarity: 'legendary',
    price: 2300,
    style: {
      flashColor: 0xfff3b0,
      ringColors: [0xffd166, 0xfff8d0],
      particleColors: [0xffe28a, 0xffb703, 0xffffff, 0xff8a5c],
      sparkColors: [0xffffff, 0xfff3b0],
      particleCount: 58,
      sparkCount: 26,
      shakeStrength: 0.6,
      shakeDuration: 0.68,
      sound: 'royal',
    },
  },

  {
    id: 'sound-classic',
    name: 'Classic Arcade',
    description:
      'Bộ âm thanh arcade gốc, tổng hợp bằng Web Audio API. Không cần tải thêm tệp.',
    category: 'soundPack',
    rarity: 'common',
    price: 0,
    isDefault: true,
    style: {
      waveform: 'triangle',
      pitch: 1,
      spread: 1,
      noiseStart: 1200,
      noiseEnd: 80,
      previewColors: [0x7ee8fa, 0xffd166, 0xff6b6b],
    },
  },
  {
    id: 'sound-futuristic',
    name: 'Futuristic',
    description:
      'Âm sắc điện tử cao và gọn hơn, dùng sóng sine với tiếng nổ lọc sắc nét.',
    category: 'soundPack',
    rarity: 'rare',
    price: 500,
    style: {
      waveform: 'sine',
      pitch: 1.18,
      spread: 0.7,
      noiseStart: 2200,
      noiseEnd: 160,
      previewColors: [0x9b7bff, 0x38bdf8, 0xffffff],
    },
  },
  {
    id: 'sound-cartoon',
    name: 'Cartoon',
    description:
      'Tiếng động vui tai, sóng vuông và cao độ nhún nhảy cho cả chém trúng, chém hụt và nổ bom.',
    category: 'soundPack',
    rarity: 'rare',
    price: 900,
    style: {
      waveform: 'square',
      pitch: 1.32,
      spread: 1.4,
      noiseStart: 900,
      noiseEnd: 200,
      previewColors: [0xffd166, 0xff8fc7, 0x7ef0a5],
    },
  },

  {
    id: 'sound-retro',
    name: 'Retro 8-Bit',
    description:
      'Âm sắc chip âm thanh cổ điển: sóng vuông, cao độ thấp và tiếng nổ bụi bặm đầy hoài niệm.',
    category: 'soundPack',
    rarity: 'rare',
    price: 700,
    style: {
      waveform: 'square',
      pitch: 0.86,
      spread: 1.6,
      noiseStart: 700,
      noiseEnd: 120,
      previewColors: [0x7ef0a5, 0xffd166, 0xff6b6b],
    },
  },
  {
    id: 'sound-bass',
    name: 'Deep Bass',
    description:
      'Âm trầm dày và tối, dùng sóng răng cưa để mỗi nhát chém và vụ nổ đều có sức nặng.',
    category: 'soundPack',
    rarity: 'rare',
    price: 800,
    style: {
      waveform: 'sawtooth',
      pitch: 0.62,
      spread: 0.9,
      noiseStart: 600,
      noiseEnd: 45,
      previewColors: [0x9b7bff, 0xff4ecd, 0x38bdf8],
    },
  },
  {
    id: 'sound-zen',
    name: 'Zen Chimes',
    description:
      'Chuông gió trong trẻo, cao độ thanh thoát và ít tiếng ồn, phù hợp với lối chơi thư thái.',
    category: 'soundPack',
    rarity: 'epic',
    price: 1150,
    style: {
      waveform: 'sine',
      pitch: 1.45,
      spread: 0.55,
      noiseStart: 2800,
      noiseEnd: 300,
      previewColors: [0x9be7ff, 0xd8b4fe, 0xffffff],
    },
  },

  {
    id: 'theme-classic',
    name: 'Classic Arcade',
    description:
      'Bảng màu gốc của Fruit Slash 3D: vàng ấm, hồng san hô và xanh cyan.',
    category: 'theme',
    rarity: 'common',
    price: 0,
    isDefault: true,
    style: {
      vars: {
        '--cyan': '#7ee8fa',
        '--mint': '#7ef0a5',
        '--amber': '#ffd166',
        '--coral': '#ff6b6b',
        '--rose': '#ff5d7d',
        '--panel': 'rgba(24, 16, 39, 0.72)',
        '--panel-strong': 'rgba(19, 12, 31, 0.92)',
      },
    },
  },
  {
    id: 'theme-dark-neon',
    name: 'Dark Neon',
    description:
      'Giao diện tối với điểm nhấn hồng - tím neon. Chỉ đổi màu UI, không ghi đè background đang dùng.',
    category: 'theme',
    rarity: 'epic',
    price: 1500,
    style: {
      vars: {
        '--cyan': '#4ef2ff',
        '--mint': '#5cffc8',
        '--amber': '#ff4ecd',
        '--coral': '#a855f7',
        '--rose': '#ff2d95',
        '--panel': 'rgba(16, 10, 34, 0.8)',
        '--panel-strong': 'rgba(10, 6, 22, 0.94)',
      },
    },
  },
  {
    id: 'theme-tropical',
    name: 'Tropical Paradise',
    description:
      'Sắc xanh dừa, vàng nắng và san hô nhiệt đới cho toàn bộ bảng điều khiển.',
    category: 'theme',
    rarity: 'legendary',
    price: 3000,
    style: {
      vars: {
        '--cyan': '#63e6be',
        '--mint': '#95f985',
        '--amber': '#ffd166',
        '--coral': '#ff9f43',
        '--rose': '#ff6b6b',
        '--panel': 'rgba(12, 42, 35, 0.76)',
        '--panel-strong': 'rgba(8, 30, 25, 0.94)',
      },
    },
  },

  {
    id: 'theme-cyber-mint',
    name: 'Cyber Mint',
    description:
      'Xanh mint tương lai kết hợp vàng chanh và nền tối xanh rêu cho cảm giác công nghệ mới.',
    category: 'theme',
    rarity: 'rare',
    price: 1000,
    style: {
      vars: {
        '--cyan': '#5ef2c0',
        '--mint': '#b8ffd9',
        '--amber': '#e0ff6b',
        '--coral': '#22d3ee',
        '--rose': '#4ade80',
        '--panel': 'rgba(8, 32, 28, 0.8)',
        '--panel-strong': 'rgba(4, 20, 17, 0.94)',
      },
    },
  },
  {
    id: 'theme-pastel-pop',
    name: 'Pastel Pop',
    description:
      'Bảng màu pastel ngọt ngào với xanh biển nhạt, hồng phấn và vàng kem, tươi sáng và dễ chịu.',
    category: 'theme',
    rarity: 'rare',
    price: 1100,
    style: {
      vars: {
        '--cyan': '#8fd3ff',
        '--mint': '#b8f5c9',
        '--amber': '#ffe08a',
        '--coral': '#ffb3c1',
        '--rose': '#ff8fab',
        '--panel': 'rgba(50, 32, 64, 0.78)',
        '--panel-strong': 'rgba(34, 20, 46, 0.94)',
      },
    },
  },
  {
    id: 'theme-sakura',
    name: 'Sakura Dream',
    description:
      'Sắc anh đào hồng phấn trên nền tím mận, mềm mại và lãng mạn cho mọi bảng điều khiển.',
    category: 'theme',
    rarity: 'epic',
    price: 1700,
    style: {
      vars: {
        '--cyan': '#ffb3d1',
        '--mint': '#ffe4ef',
        '--amber': '#ffd166',
        '--coral': '#ff6b9d',
        '--rose': '#e2487a',
        '--panel': 'rgba(42, 20, 40, 0.8)',
        '--panel-strong': 'rgba(28, 12, 27, 0.94)',
      },
    },
  },
  {
    id: 'theme-midnight-gold',
    name: 'Midnight Gold',
    description:
      'Đen xanh thẳm kết hợp vàng champagne và điểm nhấn xanh băng, sang trọng và tương phản mạnh.',
    category: 'theme',
    rarity: 'legendary',
    price: 2600,
    style: {
      vars: {
        '--cyan': '#8bb8ff',
        '--mint': '#ffe28a',
        '--amber': '#ffcc4d',
        '--coral': '#c084fc',
        '--rose': '#ffb703',
        '--panel': 'rgba(10, 16, 32, 0.84)',
        '--panel-strong': 'rgba(4, 8, 20, 0.96)',
      },
    },
  },

  {
    id: 'upgrade-bonus-coins',
    name: 'Bonus Coins',
    description:
      'Tăng tỷ lệ quy đổi điểm cuối ván thành Coins. Mỗi cấp cộng thêm 10% thưởng cơ bản.',
    category: 'upgrade',
    rarity: 'rare',
    upgradeId: 'bonusCoins',
  },
  {
    id: 'upgrade-score-bonus',
    name: 'Score Bonus',
    description:
      'Tăng điểm nhận được khi chém trúng trái cây. Mỗi cấp cộng thêm 8% điểm gốc.',
    category: 'upgrade',
    rarity: 'rare',
    upgradeId: 'scoreBonus',
  },
  {
    id: 'upgrade-combo-bonus',
    name: 'Combo Bonus',
    description:
      'Chém liên tiếp trong 5 giây để tạo chuỗi. Từ quả thứ 3, mỗi bậc combo được cộng thêm điểm theo cấp.',
    category: 'upgrade',
    rarity: 'epic',
    upgradeId: 'comboBonus',
  },
  {
    id: 'upgrade-lucky-drop',
    name: 'Lucky Drop',
    description:
      'Mỗi quả chém trúng có cơ hội rơi Coins may mắn. Phần thưởng được cộng vào kết quả cuối ván.',
    category: 'upgrade',
    rarity: 'epic',
    upgradeId: 'luckyDrop',
  },
  {
    id: 'upgrade-combo-window',
    name: 'Combo Window',
    description:
      'Kéo dài thời gian giữ chuỗi combo. Mỗi cấp cộng thêm 0,12 giây để nối những nhát chém liên tiếp.',
    category: 'upgrade',
    rarity: 'rare',
    upgradeId: 'comboWindow',
  },
  {
    id: 'upgrade-miss-shield',
    name: 'Miss Shield',
    description:
      'Giảm điểm bị trừ khi để trái cây rơi. Mỗi cấp giảm thêm 5% mức phạt, tối đa 25%.',
    category: 'upgrade',
    rarity: 'epic',
    upgradeId: 'missShield',
  },
];

const SHOP_ITEM_INDEX = new Map<string, ShopItem>(
  SHOP_ITEMS.map((item) => [item.id, item]),
);

const ITEMS_BY_CATEGORY = new Map<ShopCategory, ShopItem[]>();
for (const item of SHOP_ITEMS) {
  const bucket = ITEMS_BY_CATEGORY.get(item.category) ?? [];
  bucket.push(item);
  ITEMS_BY_CATEGORY.set(item.category, bucket);
}

export function getShopItem(itemId: string): ShopItem | undefined {
  return SHOP_ITEM_INDEX.get(itemId);
}

export function getItemsByCategory(category: ShopCategory): readonly ShopItem[] {
  return ITEMS_BY_CATEGORY.get(category) ?? [];
}

export function isCosmeticItem(item: ShopItem): item is CosmeticShopItem {
  return isEquipSlot(item.category);
}

export function getDefaultItemId(slot: EquipSlot): string {
  return DEFAULT_EQUIPPED[slot];
}

export function getDefaultItem(slot: EquipSlot): EquippableShopItem {
  const item = getShopItem(DEFAULT_EQUIPPED[slot]);
  if (!item || !isCosmeticItem(item)) {
    throw new Error(`Missing default shop item for slot: ${slot}`);
  }
  return item;
}

export function getUpgradeShopItems(): readonly UpgradeShopItem[] {
  return getItemsByCategory('upgrade') as readonly UpgradeShopItem[];
}

export function isSlotOwnedByDefault(slot: EquipSlot, itemId: string): boolean {
  return DEFAULT_EQUIPPED[slot] === itemId;
}
