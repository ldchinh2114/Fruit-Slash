import * as THREE from 'three';
import type { SlashEffectStyle } from '../shop/ShopItem';

export interface SlashRuntimeStyle {
  coreColor: THREE.Color;
  edgeColor: THREE.Color;
  glowColor: THREE.Color;
  widthScale: number;
  lifetime: number;
  sparkColors: THREE.Color[];
  sparkRate: number;
  rainbow: boolean;
}

export class SlashEffectFactory {
  create(style: SlashEffectStyle): SlashRuntimeStyle {
    return {
      coreColor: new THREE.Color(style.coreColor),
      edgeColor: new THREE.Color(style.edgeColor),
      glowColor: new THREE.Color(style.glowColor),
      widthScale: Math.max(0.5, style.widthScale),
      lifetime: Math.max(0.1, style.lifetime),
      sparkColors: style.sparkColors.map((color) => new THREE.Color(color)),
      sparkRate: Math.max(0, style.sparkRate),
      rainbow: style.rainbow,
    };
  }
}
