import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig';

interface BombTemplate {
  readonly group: THREE.Group;
  readonly geometries: THREE.BufferGeometry[];
  readonly materials: THREE.Material[];
  readonly textures: THREE.Texture[];
}

const BOMB_RADIUS = GAME_CONFIG.bomb.radius;

function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available.');
  }
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,196,92,0.9)');
  gradient.addColorStop(0.6, 'rgba(255,90,36,0.32)');
  gradient.addColorStop(1, 'rgba(255,60,20,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class BombVisualFactory {
  private template: BombTemplate | null = null;

  createBomb(): THREE.Group {
    return this.getTemplate().group.clone(true);
  }

  /** Builds and caches the bomb template before gameplay starts. */
  prewarm(): void {
    this.getTemplate();
  }

  dispose(): void {
    if (!this.template) {
      return;
    }
    for (const geometry of this.template.geometries) {
      geometry.dispose();
    }
    for (const material of this.template.materials) {
      material.dispose();
    }
    for (const texture of this.template.textures) {
      texture.dispose();
    }
    this.template = null;
  }

  private getTemplate(): BombTemplate {
    if (this.template) {
      return this.template;
    }

    const group = new THREE.Group();
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x171622,
      roughness: 0.32,
      metalness: 0.62,
    });
    const bodyGeometry = new THREE.SphereGeometry(BOMB_RADIUS, 32, 24);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);
    geometries.push(bodyGeometry);
    materials.push(bodyMaterial);

    const bandMaterial = new THREE.MeshStandardMaterial({
      color: 0x6f6b83,
      roughness: 0.26,
      metalness: 0.9,
    });
    const bandGeometry = new THREE.TorusGeometry(
      BOMB_RADIUS * 0.94,
      BOMB_RADIUS * 0.05,
      10,
      40,
    );
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.rotation.x = Math.PI / 2;
    band.castShadow = true;
    group.add(band);
    geometries.push(bandGeometry);
    materials.push(bandMaterial);

    const warningMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4b4b,
      toneMapped: false,
    });
    const warningGeometry = new THREE.TorusGeometry(
      BOMB_RADIUS * 0.58,
      BOMB_RADIUS * 0.028,
      8,
      30,
    );
    const warning = new THREE.Mesh(warningGeometry, warningMaterial);
    warning.rotation.x = Math.PI / 2;
    warning.position.y = BOMB_RADIUS * 0.16;
    group.add(warning);
    geometries.push(warningGeometry);
    materials.push(warningMaterial);

    const neckMaterial = new THREE.MeshStandardMaterial({
      color: 0x35333f,
      roughness: 0.24,
      metalness: 0.85,
    });
    const neckGeometry = new THREE.CylinderGeometry(
      BOMB_RADIUS * 0.17,
      BOMB_RADIUS * 0.22,
      BOMB_RADIUS * 0.2,
      12,
    );
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.position.y = BOMB_RADIUS * 0.96;
    neck.castShadow = true;
    group.add(neck);
    geometries.push(neckGeometry);
    materials.push(neckMaterial);

    const fuseMaterial = new THREE.MeshStandardMaterial({
      color: 0x9b6b3b,
      roughness: 0.9,
    });
    const fuseGeometry = new THREE.CylinderGeometry(
      BOMB_RADIUS * 0.045,
      BOMB_RADIUS * 0.055,
      BOMB_RADIUS * 0.42,
      7,
    );
    const fuse = new THREE.Mesh(fuseGeometry, fuseMaterial);
    fuse.position.set(-BOMB_RADIUS * 0.06, BOMB_RADIUS * 1.24, 0);
    fuse.rotation.z = 0.38;
    group.add(fuse);
    geometries.push(fuseGeometry);
    materials.push(fuseMaterial);

    const sparkMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      toneMapped: false,
    });
    const sparkGeometry = new THREE.SphereGeometry(BOMB_RADIUS * 0.09, 10, 8);
    const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
    spark.name = 'bomb-spark';
    spark.position.set(
      -BOMB_RADIUS * 0.14,
      BOMB_RADIUS * 1.46,
      0,
    );
    group.add(spark);
    geometries.push(sparkGeometry);
    materials.push(sparkMaterial);

    const glowTexture = createGlowTexture();
    textures.push(glowTexture);
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xff8a3d,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.name = 'bomb-glow';
    glow.position.copy(spark.position);
    glow.scale.setScalar(BOMB_RADIUS * 2.4);
    group.add(glow);
    materials.push(glowMaterial);

    this.template = { group, geometries, materials, textures };
    return this.template;
  }
}

export class Bomb {
  readonly group: THREE.Group;
  readonly radius: number;
  readonly velocity = new THREE.Vector3();
  readonly spin = new THREE.Vector3();
  exploded = false;
  private age = 0;
  private readonly glow: THREE.Sprite | null;
  private readonly spark: THREE.Mesh | null;
  private readonly baseGlowScale: number;
  private readonly baseSparkScale: number;

  constructor(group: THREE.Group, scale: number) {
    this.group = group;
    this.radius = BOMB_RADIUS * scale;
    this.group.scale.setScalar(scale);
    this.glow = (group.getObjectByName('bomb-glow') as THREE.Sprite | undefined) ?? null;
    this.spark =
      (group.getObjectByName('bomb-spark') as THREE.Mesh | undefined) ?? null;
    this.baseGlowScale = this.glow?.scale.x ?? BOMB_RADIUS * 2.4;
    this.baseSparkScale = this.spark?.scale.x ?? 1;
  }

  launch(velocity: THREE.Vector3, spin: THREE.Vector3): void {
    this.velocity.copy(velocity);
    this.spin.copy(spin);
  }

  update(deltaSeconds: number, gravity: number): void {
    this.age += deltaSeconds;
    this.velocity.y -= gravity * deltaSeconds;
    this.group.position.addScaledVector(this.velocity, deltaSeconds);
    this.group.rotation.x += this.spin.x * deltaSeconds;
    this.group.rotation.y += this.spin.y * deltaSeconds;
    this.group.rotation.z += this.spin.z * deltaSeconds;

    const pulse = 1 + Math.sin(this.age * 13) * 0.16;
    this.glow?.scale.setScalar(this.baseGlowScale * pulse);
    this.spark?.scale.setScalar(this.baseSparkScale * (0.9 + pulse * 0.2));
  }
}
