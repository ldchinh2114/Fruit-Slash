import * as THREE from 'three';
import type { ExplosionStyle } from '../shop/ShopItem';

export interface ExplosionRuntimeStyle {
  flashColor: number;
  ringColors: number[];
  particleColors: THREE.Color[];
  sparkColors: THREE.Color[];
  particleCount: number;
  sparkCount: number;
  shakeStrength: number;
  shakeDuration: number;
  sound: ExplosionStyle['sound'];
}

export class ExplosionEffectFactory {
  create(style: ExplosionStyle): ExplosionRuntimeStyle {
    return {
      flashColor: style.flashColor,
      ringColors: style.ringColors.slice(0, 4),
      particleColors: style.particleColors.map((color) => new THREE.Color(color)),
      sparkColors: style.sparkColors.map((color) => new THREE.Color(color)),
      particleCount: Math.max(0, Math.min(80, style.particleCount)),
      sparkCount: Math.max(0, Math.min(40, style.sparkCount)),
      shakeStrength: Math.max(0, style.shakeStrength),
      shakeDuration: Math.max(0.1, style.shakeDuration),
      sound: style.sound,
    };
  }
}
