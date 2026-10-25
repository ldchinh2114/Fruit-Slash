import * as THREE from 'three';
import type { FruitSkinStyle } from '../shop/ShopItem';

function createSkinTexture(style: FruitSkinStyle): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available.');
  }
  const primary = `#${style.primaryColor.toString(16).padStart(6, '0')}`;
  const accent = `#${style.accentColor.toString(16).padStart(6, '0')}`;
  context.fillStyle = primary;
  context.fillRect(0, 0, 512, 512);

  switch (style.pattern) {
    case 'gold':
      drawGold(context, accent);
      break;
    case 'neon':
      drawNeon(context, accent);
      break;
    case 'crystal':
      drawCrystal(context, accent);
      break;
    case 'candy':
      drawCandy(context, accent);
      break;
    case 'galaxy':
      drawGalaxy(context, accent);
      break;
    case 'emerald':
      drawEmerald(context, accent);
      break;
    case 'lava':
      drawLava(context, accent);
      break;
    case 'frost':
      drawFrost(context, accent);
      break;
    case 'chrome':
      drawChrome(context, accent);
      break;
    case 'classic':
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function drawGold(context: CanvasRenderingContext2D, accent: string): void {
  const sheen = context.createRadialGradient(150, 120, 10, 240, 220, 420);
  sheen.addColorStop(0, `${accent}dd`);
  sheen.addColorStop(0.4, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(1, 'rgba(90,52,0,0.32)');
  context.fillStyle = sheen;
  context.fillRect(0, 0, 512, 512);
  context.save();
  context.globalAlpha = 0.3;
  context.lineCap = 'round';
  for (let index = 0; index < 22; index += 1) {
    const offset = -140 + index * 38;
    context.strokeStyle = index % 3 === 0 ? '#fff6cf' : '#a86b00';
    context.lineWidth = index % 3 === 0 ? 8 : 3;
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset + 260, 512);
    context.stroke();
  }
  context.restore();
  drawSpeckles(context, 'rgba(255,255,255,0.5)', 120, 2);
}

function drawNeon(context: CanvasRenderingContext2D, accent: string): void {
  context.fillStyle = 'rgba(4,10,26,0.35)';
  context.fillRect(0, 0, 512, 512);
  context.save();
  context.strokeStyle = accent;
  context.shadowColor = accent;
  context.shadowBlur = 18;
  context.lineWidth = 7;
  for (let index = 0; index < 5; index += 1) {
    const y = 56 + index * 96;
    context.beginPath();
    context.moveTo(0, y);
    context.bezierCurveTo(160, y - 42, 340, y + 42, 512, y - 10);
    context.stroke();
  }
  context.globalAlpha = 0.75;
  context.lineWidth = 2;
  for (let index = 0; index < 7; index += 1) {
    const x = 30 + index * 72;
    context.beginPath();
    context.moveTo(x, 20);
    context.lineTo(x + 40, 492);
    context.stroke();
  }
  context.restore();
  drawSpeckles(context, 'rgba(255,255,255,0.8)', 90, 2.4);
}

function drawCrystal(context: CanvasRenderingContext2D, accent: string): void {
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(0, 0, 512, 512);
  for (let index = 0; index < 26; index += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 30 + Math.random() * 90;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + size, y + size * 0.35);
    context.lineTo(x + size * 0.45, y + size);
    context.closePath();
    context.fillStyle =
      index % 2 === 0
        ? 'rgba(255,255,255,0.22)'
        : `${accent}26`;
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.4)';
    context.lineWidth = 2;
    context.stroke();
  }
  const sheen = context.createLinearGradient(0, 0, 512, 512);
  sheen.addColorStop(0, 'rgba(255,255,255,0.45)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.2)');
  context.fillStyle = sheen;
  context.fillRect(0, 0, 512, 512);
}

function drawCandy(context: CanvasRenderingContext2D, accent: string): void {
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = accent;
  context.lineWidth = 32;
  context.globalAlpha = 0.8;
  for (let index = 0; index < 6; index += 1) {
    const x = index * 92 - 20;
    context.beginPath();
    context.moveTo(x, -20);
    context.bezierCurveTo(x + 80, 130, x - 90, 340, x + 10, 540);
    context.stroke();
  }
  context.restore();
  drawSpeckles(context, 'rgba(255,255,255,0.7)', 130, 3);
  const gloss = context.createLinearGradient(0, 0, 0, 512);
  gloss.addColorStop(0, 'rgba(255,255,255,0.35)');
  gloss.addColorStop(0.45, 'rgba(255,255,255,0)');
  gloss.addColorStop(1, 'rgba(120,20,80,0.18)');
  context.fillStyle = gloss;
  context.fillRect(0, 0, 512, 512);
}

function drawGalaxy(context: CanvasRenderingContext2D, accent: string): void {
  for (let index = 0; index < 5; index += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = 90 + Math.random() * 160;
    const nebula = context.createRadialGradient(x, y, 0, x, y, radius);
    nebula.addColorStop(0, `${accent}44`);
    nebula.addColorStop(0.55, 'rgba(255,90,210,0.12)');
    nebula.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = nebula;
    context.fillRect(0, 0, 512, 512);
  }
  drawSpeckles(context, 'rgba(255,255,255,0.9)', 260, 2.2);
  drawSpeckles(context, 'rgba(180,160,255,0.75)', 90, 1.6);
}

function drawEmerald(context: CanvasRenderingContext2D, accent: string): void {
  context.save();
  context.globalAlpha = 0.42;
  for (let index = 0; index < 18; index += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 46 + Math.random() * 96;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + size, y + size * 0.42);
    context.lineTo(x + size * 0.52, y + size);
    context.lineTo(x - size * 0.18, y + size * 0.62);
    context.closePath();
    context.fillStyle = index % 3 === 0 ? `${accent}44` : 'rgba(2, 44, 34, 0.45)';
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    context.lineWidth = 1.6;
    context.stroke();
  }
  context.restore();
  drawSpeckles(context, 'rgba(255, 255, 255, 0.55)', 110, 2);
}

function drawLava(context: CanvasRenderingContext2D, accent: string): void {
  context.fillStyle = 'rgba(12, 6, 6, 0.32)';
  context.fillRect(0, 0, 512, 512);
  context.save();
  context.lineCap = 'round';
  context.shadowColor = accent;
  context.shadowBlur = 22;
  for (let index = 0; index < 12; index += 1) {
    let x = Math.random() * 512;
    let y = -20;
    context.beginPath();
    context.moveTo(x, y);
    context.strokeStyle = index % 3 === 0 ? '#ffd166' : accent;
    context.lineWidth = 3 + Math.random() * 5;
    while (y < 540) {
      x += (Math.random() - 0.5) * 64;
      y += 26 + Math.random() * 44;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();
  drawSpeckles(context, 'rgba(255, 209, 102, 0.8)', 90, 2.4);
}

function drawFrost(context: CanvasRenderingContext2D, accent: string): void {
  context.fillStyle = 'rgba(255, 255, 255, 0.2)';
  context.fillRect(0, 0, 512, 512);
  context.save();
  context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  context.lineWidth = 3;
  for (let index = 0; index < 22; index += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = 20 + Math.random() * 70;
    for (let arm = 0; arm < 6; arm += 1) {
      const angle = (arm / 6) * Math.PI * 2;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
      );
      context.stroke();
    }
    context.beginPath();
    context.arc(x, y, radius * 0.18, 0, Math.PI * 2);
    context.fillStyle = `${accent}aa`;
    context.fill();
  }
  context.restore();
  const sheen = context.createLinearGradient(0, 0, 512, 512);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  sheen.addColorStop(0.48, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(1, 'rgba(147, 197, 253, 0.4)');
  context.fillStyle = sheen;
  context.fillRect(0, 0, 512, 512);
}

function drawChrome(context: CanvasRenderingContext2D, accent: string): void {
  const bands = context.createLinearGradient(0, 0, 512, 512);
  bands.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  bands.addColorStop(0.14, 'rgba(71, 85, 105, 0.55)');
  bands.addColorStop(0.28, 'rgba(255, 255, 255, 0.9)');
  bands.addColorStop(0.44, 'rgba(15, 23, 42, 0.4)');
  bands.addColorStop(0.6, 'rgba(255, 255, 255, 0.8)');
  bands.addColorStop(0.76, 'rgba(100, 116, 139, 0.5)');
  bands.addColorStop(1, 'rgba(226, 232, 240, 0.9)');
  context.fillStyle = bands;
  context.fillRect(0, 0, 512, 512);
  context.save();
  context.globalAlpha = 0.5;
  context.strokeStyle = accent;
  context.lineWidth = 10;
  for (let index = 0; index < 5; index += 1) {
    const offset = -160 + index * 150;
    context.beginPath();
    context.moveTo(offset, 512);
    context.lineTo(offset + 260, 0);
    context.stroke();
  }
  context.restore();
  drawSpeckles(context, 'rgba(255, 255, 255, 0.75)', 70, 1.6);
}

function drawSpeckles(
  context: CanvasRenderingContext2D,
  color: string,
  count: number,
  maxRadius: number,
): void {
  context.fillStyle = color;
  for (let index = 0; index < count; index += 1) {
    context.beginPath();
    context.arc(
      Math.random() * 512,
      Math.random() * 512,
      0.5 + Math.random() * maxRadius,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}

export class FruitSkinFactory {
  private texture: THREE.CanvasTexture | null = null;
  private bodyMaterial: THREE.MeshStandardMaterial | null = null;

  setStyle(style: FruitSkinStyle | null): void {
    this.disposeActive();

    if (!style || style.pattern === 'classic') {
      return;
    }

    this.texture = createSkinTexture(style);
    const emissive =
      style.pattern === 'neon' ||
      style.pattern === 'galaxy' ||
      style.pattern === 'lava'
        ? new THREE.Color(style.accentColor)
        : new THREE.Color(style.primaryColor);
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      map: this.texture,
      roughness: Math.min(1, Math.max(0, style.roughness)),
      metalness: Math.min(1, Math.max(0, style.metalness)),
      emissive,
      emissiveIntensity: Math.max(0, style.emissiveIntensity),
      transparent: style.opacity < 1,
      opacity: Math.min(1, Math.max(0.35, style.opacity)),
    });
  }

  applyToGroup(group: THREE.Group): void {
    if (!this.bodyMaterial) {
      return;
    }
    const material = this.bodyMaterial;
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === 'fruit-body') {
        child.material = material;
      }
    });
  }

  createOuterMaterial(): THREE.MeshStandardMaterial | null {
    if (!this.bodyMaterial) {
      return null;
    }
    const material = this.bodyMaterial.clone();
    material.transparent = true;
    return material;
  }

  get isActive(): boolean {
    return this.bodyMaterial !== null;
  }

  dispose(): void {
    this.disposeActive();
  }

  private disposeActive(): void {
    this.texture?.dispose();
    this.texture = null;
    this.bodyMaterial?.dispose();
    this.bodyMaterial = null;
  }
}
