import * as THREE from 'three';
import type { FruitDefinition, FruitId } from '../config/gameConfig';
import type { FruitSkinStyle } from '../shop/ShopItem';
import { FruitSkinFactory } from '../rendering/FruitSkinFactory';

const UP = new THREE.Vector3(0, 1, 0);
const LEAF_COLOR = 0x69b34c;
const STEM_COLOR = 0x6b4423;

interface FruitTemplate {
  readonly group: THREE.Group;
  readonly bodyMaterial: THREE.MeshStandardMaterial;
  readonly geometries: THREE.BufferGeometry[];
  readonly materials: THREE.Material[];
  readonly textures: THREE.Texture[];
}

function createCanvasTexture(
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available.');
  }
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function createWatermelonTexture(): THREE.CanvasTexture {
  return createCanvasTexture(512, 256, (context) => {
    context.fillStyle = '#1c6b35';
    context.fillRect(0, 0, 512, 256);
    context.lineCap = 'round';
    for (let index = 0; index < 7; index += 1) {
      const baseX = 24 + index * 76;
      context.beginPath();
      context.strokeStyle = index % 2 === 0 ? '#72c44f' : '#8ddb63';
      context.lineWidth = index % 2 === 0 ? 15 : 9;
      context.globalAlpha = 0.82;
      context.moveTo(baseX, -10);
      context.bezierCurveTo(baseX + 26, 70, baseX - 24, 175, baseX + 8, 266);
      context.stroke();
    }
    context.globalAlpha = 1;
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, 'rgba(255,255,255,0.16)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.24)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 256);
  });
}

function createKiwiTexture(): THREE.CanvasTexture {
  return createCanvasTexture(512, 512, (context) => {
    context.fillStyle = '#8a5a2b';
    context.fillRect(0, 0, 512, 512);
    for (let index = 0; index < 900; index += 1) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 1 + Math.random() * 3.2;
      context.beginPath();
      context.fillStyle =
        Math.random() > 0.45 ? 'rgba(61,38,17,0.5)' : 'rgba(196,155,103,0.32)';
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    const gradient = context.createRadialGradient(190, 170, 30, 256, 256, 340);
    gradient.addColorStop(0, 'rgba(255,224,177,0.2)');
    gradient.addColorStop(1, 'rgba(35,19,6,0.35)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
  });
}

function addMesh(
  template: FruitTemplate,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  options: {
    position?: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: THREE.Vector3;
  } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  if (options.position) {
    mesh.position.copy(options.position);
  }
  if (options.rotation) {
    mesh.rotation.copy(options.rotation);
  }
  if (options.scale) {
    mesh.scale.copy(options.scale);
  }
  mesh.castShadow = true;
  template.group.add(mesh);
  template.geometries.push(geometry);
  template.materials.push(material);
  return mesh;
}

function addStem(template: FruitTemplate, radius: number, height: number): void {
  const geometry = new THREE.CylinderGeometry(
    radius * 0.035,
    radius * 0.06,
    height,
    7,
  );
  const material = new THREE.MeshStandardMaterial({
    color: STEM_COLOR,
    roughness: 0.85,
  });
  addMesh(template, geometry, material, {
    position: new THREE.Vector3(radius * 0.05, radius * 0.98 + height / 2, 0),
    rotation: new THREE.Euler(0, 0, -0.12),
  });
}

function addLeaf(template: FruitTemplate, radius: number, flip = false): void {
  const geometry = new THREE.SphereGeometry(radius * 0.3, 12, 8);
  const material = new THREE.MeshStandardMaterial({
    color: LEAF_COLOR,
    roughness: 0.5,
    metalness: 0.02,
  });
  addMesh(template, geometry, material, {
    position: new THREE.Vector3(
      radius * (flip ? -0.22 : 0.32),
      radius * 1.03,
      radius * 0.06,
    ),
    rotation: new THREE.Euler(0.2, 0.3, flip ? -0.7 : 0.55),
    scale: new THREE.Vector3(1.4, 0.24, 0.7),
  });
}

export class FruitVisualFactory {
  private readonly templates = new Map<FruitId, FruitTemplate>();
  private readonly skinFactory = new FruitSkinFactory();

  setSkinStyle(style: FruitSkinStyle | null): void {
    this.skinFactory.setStyle(style);
  }

  /** Builds and caches the meshes for every fruit before gameplay starts. */
  prewarm(definitions: readonly FruitDefinition[]): void {
    for (const definition of definitions) {
      this.getTemplate(definition);
    }
  }

  createFruit(definition: FruitDefinition): THREE.Group {
    const group = this.getTemplate(definition).group.clone(true);
    this.skinFactory.applyToGroup(group);
    return group;
  }

  createSliceOuterMaterial(definition: FruitDefinition): THREE.MeshStandardMaterial {
    const skinMaterial = this.skinFactory.createOuterMaterial();
    if (skinMaterial) {
      skinMaterial.transparent = true;
      return skinMaterial;
    }
    const material = this.getTemplate(definition).bodyMaterial.clone();
    material.transparent = true;
    return material;
  }

  dispose(): void {
    this.skinFactory.dispose();
    for (const template of this.templates.values()) {
      for (const geometry of template.geometries) {
        geometry.dispose();
      }
      for (const material of template.materials) {
        material.dispose();
      }
      for (const texture of template.textures) {
        texture.dispose();
      }
    }
    this.templates.clear();
  }

  private getTemplate(definition: FruitDefinition): FruitTemplate {
    let template = this.templates.get(definition.id);
    if (!template) {
      template = this.buildTemplate(definition);
      this.templates.set(definition.id, template);
    }
    return template;
  }

  private buildTemplate(definition: FruitDefinition): FruitTemplate {
    const template: FruitTemplate = {
      group: new THREE.Group(),
      bodyMaterial: new THREE.MeshStandardMaterial(),
      geometries: [],
      materials: [],
      textures: [],
    };
    const radius = definition.radius;
    let bodyMaterial: THREE.MeshStandardMaterial;
    let bodyGeometry: THREE.BufferGeometry;
    const bodyScale = new THREE.Vector3(1, 1, 1);

    switch (definition.shape) {
      case 'watermelon': {
        const texture = createWatermelonTexture();
        template.textures.push(texture);
        bodyMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.48,
          metalness: 0.02,
        });
        bodyGeometry = new THREE.SphereGeometry(radius, 40, 28);
        addStem(template, radius, radius * 0.32);
        break;
      }
      case 'orange': {
        bodyMaterial = new THREE.MeshStandardMaterial({
          color: definition.color,
          roughness: 0.56,
          metalness: 0.02,
        });
        bodyGeometry = new THREE.SphereGeometry(radius, 36, 24);
        addStem(template, radius, radius * 0.26);
        addLeaf(template, radius);
        break;
      }
      case 'apple': {
        bodyMaterial = new THREE.MeshStandardMaterial({
          color: definition.color,
          roughness: 0.36,
          metalness: 0.02,
        });
        bodyGeometry = new THREE.SphereGeometry(radius, 38, 26);
        bodyScale.set(1, 1.04, 1);
        addStem(template, radius, radius * 0.4);
        addLeaf(template, radius, true);
        break;
      }
      case 'lemon': {
        bodyMaterial = new THREE.MeshStandardMaterial({
          color: definition.color,
          roughness: 0.44,
          metalness: 0.02,
        });
        bodyGeometry = new THREE.SphereGeometry(radius, 34, 24);
        bodyScale.set(1.18, 0.82, 0.82);
        const tipGeometry = new THREE.ConeGeometry(radius * 0.13, radius * 0.2, 10);
        const tipMaterial = new THREE.MeshStandardMaterial({
          color: definition.color,
          roughness: 0.5,
        });
        addMesh(template, tipGeometry.clone(), tipMaterial, {
          position: new THREE.Vector3(radius * 1.24, 0, 0),
          rotation: new THREE.Euler(0, 0, -Math.PI / 2),
        });
        addMesh(template, tipGeometry, tipMaterial, {
          position: new THREE.Vector3(-radius * 1.24, 0, 0),
          rotation: new THREE.Euler(0, 0, Math.PI / 2),
        });
        addLeaf(template, radius);
        break;
      }
      case 'kiwi': {
        const texture = createKiwiTexture();
        template.textures.push(texture);
        bodyMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.82,
          metalness: 0.01,
        });
        bodyGeometry = new THREE.SphereGeometry(radius, 34, 24);
        bodyScale.set(1, 1.08, 1);
        addStem(template, radius, radius * 0.22);
        break;
      }
      case 'plum': {
        bodyMaterial = new THREE.MeshStandardMaterial({
          color: definition.color,
          roughness: 0.32,
          metalness: 0.04,
        });
        bodyGeometry = new THREE.SphereGeometry(radius, 36, 24);
        bodyScale.set(1, 1.08, 1);
        addStem(template, radius, radius * 0.26);
        addLeaf(template, radius);
        break;
      }
      case 'peach': {
        bodyMaterial = new THREE.MeshStandardMaterial({
          color: definition.color,
          roughness: 0.62,
          metalness: 0.01,
        });
        bodyGeometry = new THREE.SphereGeometry(radius, 36, 24);
        bodyScale.set(1.08, 1, 1);
        addStem(template, radius, radius * 0.22);
        addLeaf(template, radius, true);
        break;
      }
      case 'dragonfruit': {
        bodyMaterial = new THREE.MeshStandardMaterial({
          color: definition.color,
          roughness: 0.44,
          metalness: 0.02,
        });
        bodyGeometry = new THREE.SphereGeometry(radius, 36, 24);
        bodyScale.set(0.96, 1.1, 0.96);
        const finGeometry = new THREE.ConeGeometry(radius * 0.2, radius * 0.62, 4);
        const finMaterial = new THREE.MeshStandardMaterial({
          color: definition.accentColor,
          roughness: 0.48,
          metalness: 0.02,
        });
        const finCount = 7;
        for (let index = 0; index < finCount; index += 1) {
          const angle = (index / finCount) * Math.PI * 2 + 0.3;
          const direction = new THREE.Vector3(
            Math.cos(angle) * 0.78,
            0.32 + (index % 2) * 0.24,
            Math.sin(angle) * 0.78,
          ).normalize();
          const position = direction.clone().multiplyScalar(radius * 0.92);
          const fin = new THREE.Mesh(finGeometry, finMaterial);
          fin.position.copy(position);
          fin.quaternion.setFromUnitVectors(UP, direction);
          fin.scale.set(1, 1, 0.5);
          fin.castShadow = true;
          template.group.add(fin);
        }
        template.geometries.push(finGeometry);
        template.materials.push(finMaterial);
        break;
      }
    }

    template.bodyMaterial.color.copy(
      definition.shape === 'watermelon' || definition.shape === 'kiwi'
        ? new THREE.Color(0xffffff)
        : new THREE.Color(definition.color),
    );
    template.bodyMaterial.map = bodyMaterial.map;
    template.bodyMaterial.roughness = bodyMaterial.roughness;
    template.bodyMaterial.metalness = bodyMaterial.metalness;
    template.bodyMaterial.needsUpdate = true;
    if (bodyMaterial !== template.bodyMaterial) {
      bodyMaterial.dispose();
    }

    const body = addMesh(template, bodyGeometry, template.bodyMaterial, {
      scale: bodyScale,
    });
    body.name = 'fruit-body';
    return template;
  }
}

export type FruitSpecialKind = 'golden' | 'rainbow';

export class Fruit {
  readonly definition: FruitDefinition;
  readonly group: THREE.Group;
  readonly radius: number;
  readonly velocity = new THREE.Vector3();
  private readonly angularVelocity = new THREE.Vector3();
  sliced = false;
  missed = false;
  enteredPlayfield = false;
  special: FruitSpecialKind | null = null;
  scoreMultiplier = 1;
  specialLifetimeRemaining = Number.POSITIVE_INFINITY;
  aura: THREE.Object3D | null = null;
  auraTime = 0;

  constructor(definition: FruitDefinition, group: THREE.Group, scale: number) {
    this.definition = definition;
    this.group = group;
    this.radius = definition.radius * scale;
    this.group.scale.setScalar(scale);
  }

  makeSpecial(
    kind: FruitSpecialKind,
    scoreMultiplier: number,
    lifetimeSeconds: number,
  ): void {
    this.special = kind;
    this.scoreMultiplier = Math.max(1, scoreMultiplier);
    this.specialLifetimeRemaining = Math.max(1, lifetimeSeconds);
  }

  launch(velocity: THREE.Vector3, angularVelocity: THREE.Vector3): void {
    this.velocity.copy(velocity);
    this.angularVelocity.copy(angularVelocity);
  }

  update(deltaSeconds: number, gravity: number): void {
    this.velocity.y -= gravity * deltaSeconds;
    this.group.position.addScaledVector(this.velocity, deltaSeconds);
    this.group.rotation.x += this.angularVelocity.x * deltaSeconds;
    this.group.rotation.y += this.angularVelocity.y * deltaSeconds;
    this.group.rotation.z += this.angularVelocity.z * deltaSeconds;
  }
}
