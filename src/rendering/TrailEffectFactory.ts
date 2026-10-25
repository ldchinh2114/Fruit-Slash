import * as THREE from 'three';
import type { TrailStyle } from '../shop/ShopItem';

export interface TrailRuntimeStyle {
  colors: THREE.Color[];
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

export class TrailEffectFactory {
  create(style: TrailStyle): TrailRuntimeStyle | null {
    if (style.colors.length === 0 || style.maxEmitters <= 0) {
      return null;
    }
    return {
      colors: style.colors.map((color) => new THREE.Color(color)),
      intervalSeconds: Math.max(0.03, style.intervalSeconds),
      lifeMin: Math.max(0.1, style.lifeMin),
      lifeMax: Math.max(style.lifeMin, style.lifeMax),
      sizeMin: Math.max(0.04, style.sizeMin),
      sizeMax: Math.max(style.sizeMin, style.sizeMax),
      gravityScale: style.gravityScale,
      drag: Math.max(0, style.drag),
      maxEmitters: Math.max(0, Math.min(6, style.maxEmitters)),
      rainbow: style.rainbow,
    };
  }
}
