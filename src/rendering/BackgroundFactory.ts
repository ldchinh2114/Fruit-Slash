import * as THREE from 'three';
import type { BackgroundStyle } from '../shop/ShopItem';

export interface BackgroundHandle {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
}

const BACKGROUND_Z = -9;

function createBackgroundTexture(style: BackgroundStyle): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available.');
  }

  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, style.topColor);
  gradient.addColorStop(0.62, style.bottomColor);
  gradient.addColorStop(1, style.bottomColor);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 512);

  const horizon = context.createRadialGradient(
    512,
    330,
    10,
    512,
    330,
    380,
  );
  horizon.addColorStop(0, `${style.horizonColor}55`);
  horizon.addColorStop(0.55, `${style.horizonColor}18`);
  horizon.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = horizon;
  context.fillRect(0, 0, 1024, 512);

  const vignette = context.createRadialGradient(
    512,
    230,
    120,
    512,
    260,
    680,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(2,2,8,0.5)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, 1024, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available.');
  }
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.42)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class BackgroundFactory {
  create(style: BackgroundStyle): BackgroundHandle {
    const group = new THREE.Group();
    group.name = 'shop-background';
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const backdropTexture = createBackgroundTexture(style);
    const backdropGeometry = new THREE.PlaneGeometry(120, 70);
    const backdropMaterial = new THREE.MeshBasicMaterial({
      map: backdropTexture,
      depthWrite: false,
      toneMapped: false,
    });
    const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
    backdrop.position.set(0, 0.4, BACKGROUND_Z);
    backdrop.renderOrder = -100;
    group.add(backdrop);
    textures.push(backdropTexture);
    geometries.push(backdropGeometry);
    materials.push(backdropMaterial);

    const glowTexture = createGlowTexture();
    textures.push(glowTexture);

    switch (style.decoration) {
      case 'garden':
        this.addBokeh(group, style, glowTexture, geometries, materials, {
          count: 36,
          size: 0.42,
          opacity: 0.28,
          zMin: -8,
          zMax: -5.8,
        });
        this.addGlowSprite(
          group,
          new THREE.Vector3(-6, 3.5, -8.2),
          18,
          0xb8f5a8,
          0.12,
          glowTexture,
          materials,
        );
        break;
      case 'sunset': {
        this.addGlowSprite(
          group,
          new THREE.Vector3(-4.5, 2.8, -8.2),
          12,
          style.dustColor,
          0.5,
          glowTexture,
          materials,
        );
        this.addGlowSprite(
          group,
          new THREE.Vector3(-4.5, 2.8, -8.3),
          5.5,
          0xfff0c8,
          0.65,
          glowTexture,
          materials,
        );
        this.addBokeh(group, style, glowTexture, geometries, materials, {
          count: 22,
          size: 0.32,
          opacity: 0.24,
          zMin: -8,
          zMax: -6,
        });
        break;
      }
      case 'neon':
        this.addNeonGrid(group, style, geometries, materials);
        this.addBokeh(group, style, glowTexture, geometries, materials, {
          count: 28,
          size: 0.36,
          opacity: 0.32,
          zMin: -8,
          zMax: -6.2,
        });
        break;
      case 'space':
        this.addStars(group, style, glowTexture, geometries, materials);
        this.addGlowSprite(
          group,
          new THREE.Vector3(7, 4.5, -8.4),
          15,
          0x6d4ec9,
          0.26,
          glowTexture,
          materials,
        );
        this.addPlanet(group, new THREE.Vector3(8.5, 4.8, -8.1), geometries, materials);
        break;
      case 'candy':
        this.addBokeh(group, style, glowTexture, geometries, materials, {
          count: 44,
          size: 0.5,
          opacity: 0.4,
          zMin: -8.4,
          zMax: -5.6,
        });
        this.addGlowSprite(
          group,
          new THREE.Vector3(5.5, 4, -8.2),
          16,
          0xffd9f4,
          0.2,
          glowTexture,
          materials,
        );
        break;
      case 'aurora':
        this.addAurora(group, style, glowTexture, geometries, materials);
        this.addStars(group, style, glowTexture, geometries, materials);
        break;
      case 'ocean':
        this.addOceanRays(group, style, glowTexture, geometries, materials);
        this.addBokeh(group, style, glowTexture, geometries, materials, {
          count: 34,
          size: 0.38,
          opacity: 0.26,
          zMin: -8.4,
          zMax: -5.8,
        });
        this.addGlowSprite(
          group,
          new THREE.Vector3(0, 7.5, -8.2),
          22,
          new THREE.Color(style.horizonColor).getHex(),
          0.14,
          glowTexture,
          materials,
        );
        break;
      case 'volcano':
        this.addVolcanoGlow(group, style, glowTexture, geometries, materials);
        this.addBokeh(group, style, glowTexture, geometries, materials, {
          count: 44,
          size: 0.32,
          opacity: 0.36,
          zMin: -8.2,
          zMax: -5.6,
        });
        this.addGlowSprite(
          group,
          new THREE.Vector3(-6, -1.5, -8.1),
          18,
          style.dustColor,
          0.2,
          glowTexture,
          materials,
        );
        break;
      case 'sakura':
        this.addGlowSprite(
          group,
          new THREE.Vector3(5.5, 4.4, -8.2),
          13,
          style.dustColor,
          0.32,
          glowTexture,
          materials,
        );
        this.addBokeh(group, style, glowTexture, geometries, materials, {
          count: 48,
          size: 0.34,
          opacity: 0.32,
          zMin: -8.4,
          zMax: -5.6,
        });
        break;
      case 'none':
        break;
    }

    return { group, geometries, materials, textures };
  }

  dispose(handle: BackgroundHandle | null): void {
    if (!handle) {
      return;
    }
    for (const geometry of handle.geometries) {
      geometry.dispose();
    }
    for (const material of handle.materials) {
      material.dispose();
    }
    for (const texture of handle.textures) {
      texture.dispose();
    }
  }

  private addAurora(
    group: THREE.Group,
    style: BackgroundStyle,
    texture: THREE.Texture,
    geometries: THREE.BufferGeometry[],
    materials: THREE.Material[],
  ): void {
    const colors: Array<number | string> = [
      style.horizonColor,
      0x818cf8,
      style.dustColor,
      0xf472b6,
    ];
    colors.forEach((colorValue, index) => {
      const geometry = new THREE.PlaneGeometry(
        30 - index * 4,
        6.5 + index * 0.8,
      );
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        color: new THREE.Color(colorValue),
        transparent: true,
        opacity: index === 1 ? 0.18 : 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const ribbon = new THREE.Mesh(geometry, material);
      ribbon.position.set(
        -6 + index * 4,
        5.2 + (index % 2) * 1.1,
        -8.4 + index * 0.03,
      );
      ribbon.rotation.z = -0.24 + index * 0.1;
      ribbon.renderOrder = -89;
      group.add(ribbon);
      geometries.push(geometry);
      materials.push(material);
    });
  }

  private addOceanRays(
    group: THREE.Group,
    style: BackgroundStyle,
    texture: THREE.Texture,
    geometries: THREE.BufferGeometry[],
    materials: THREE.Material[],
  ): void {
    for (let index = 0; index < 5; index += 1) {
      const geometry = new THREE.PlaneGeometry(2.4, 26);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        color: style.dustColor,
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const ray = new THREE.Mesh(geometry, material);
      ray.position.set(-13 + index * 6.4, 1.2, -8.3);
      ray.rotation.z = -0.14 - (index % 2) * 0.1;
      ray.renderOrder = -90;
      group.add(ray);
      geometries.push(geometry);
      materials.push(material);
    }
  }

  private addVolcanoGlow(
    group: THREE.Group,
    style: BackgroundStyle,
    texture: THREE.Texture,
    geometries: THREE.BufferGeometry[],
    materials: THREE.Material[],
  ): void {
    const glowGeometry = new THREE.PlaneGeometry(120, 22);
    const glowMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      color: style.horizonColor,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, -12, -8.35);
    glow.renderOrder = -90;
    group.add(glow);
    geometries.push(glowGeometry);
    materials.push(glowMaterial);

    const hazeGeometry = new THREE.PlaneGeometry(90, 14);
    const hazeMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      color: style.dustColor,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const haze = new THREE.Mesh(hazeGeometry, hazeMaterial);
    haze.position.set(0, -7, -8.3);
    haze.renderOrder = -89;
    group.add(haze);
    geometries.push(hazeGeometry);
    materials.push(hazeMaterial);
  }

  private addGlowSprite(
    group: THREE.Group,
    position: THREE.Vector3,
    scale: number,
    color: number,
    opacity: number,
    texture: THREE.Texture,
    materials: THREE.Material[],
  ): void {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(scale, scale, 1);
    sprite.renderOrder = -90;
    group.add(sprite);
    materials.push(material);
  }

  private addBokeh(
    group: THREE.Group,
    style: BackgroundStyle,
    texture: THREE.Texture,
    geometries: THREE.BufferGeometry[],
    materials: THREE.Material[],
    options: {
      count: number;
      size: number;
      opacity: number;
      zMin: number;
      zMax: number;
    },
  ): void {
    const count = Math.min(60, Math.max(1, options.count));
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const base = new THREE.Color(style.horizonColor);
    const accent = new THREE.Color(style.dustColor);
    const color = new THREE.Color();
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = randomRange(-18, 18);
      positions[index * 3 + 1] = randomRange(-8, 10);
      positions[index * 3 + 2] = randomRange(options.zMin, options.zMax);
      color.copy(base).lerp(accent, Math.random());
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      map: texture,
      size: options.size,
      transparent: true,
      opacity: options.opacity,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = -90;
    group.add(points);
    geometries.push(geometry);
    materials.push(material);
  }

  private addStars(
    group: THREE.Group,
    style: BackgroundStyle,
    texture: THREE.Texture,
    geometries: THREE.BufferGeometry[],
    materials: THREE.Material[],
  ): void {
    const count = 150;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = randomRange(-24, 24);
      positions[index * 3 + 1] = randomRange(-10, 13);
      positions[index * 3 + 2] = randomRange(-8.6, -6.2);
      color
        .setHex(index % 5 === 0 ? style.dustColor : 0xffffff)
        .multiplyScalar(randomRange(0.6, 1));
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      map: texture,
      size: 0.24,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = -92;
    group.add(points);
    geometries.push(geometry);
    materials.push(material);
  }

  private addNeonGrid(
    group: THREE.Group,
    style: BackgroundStyle,
    geometries: THREE.BufferGeometry[],
    materials: THREE.Material[],
  ): void {
    const positions: number[] = [];
    const colors: number[] = [];
    const cyan = new THREE.Color(0x2ee8ff);
    const magenta = new THREE.Color(style.horizonColor);

    for (let index = 0; index < 13; index += 1) {
      const y = -10 + index * 1.15;
      positions.push(-30, y, -7.4, 30, y, -7.4);
      const color = index % 2 === 0 ? cyan : magenta;
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }
    for (let index = 0; index < 19; index += 1) {
      const x = -27 + index * 3;
      positions.push(x, -10, -7.4, x, 4.5, -7.4);
      const color = index % 2 === 0 ? magenta : cyan;
      colors.push(color.r, color.g, color.b, color.r * 0.3, color.g * 0.3, color.b * 0.3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const grid = new THREE.LineSegments(geometry, material);
    grid.renderOrder = -91;
    group.add(grid);
    geometries.push(geometry);
    materials.push(material);
  }

  private addPlanet(
    group: THREE.Group,
    position: THREE.Vector3,
    geometries: THREE.BufferGeometry[],
    materials: THREE.Material[],
  ): void {
    const geometry = new THREE.CircleGeometry(3, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0x1c1440,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      toneMapped: false,
    });
    const planet = new THREE.Mesh(geometry, material);
    planet.position.copy(position);
    planet.renderOrder = -93;
    group.add(planet);
    geometries.push(geometry);
    materials.push(material);
  }
}
