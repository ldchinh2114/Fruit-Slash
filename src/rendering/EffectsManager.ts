import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig';
import type { Bomb } from '../entities/Bomb';
import type { Fruit, FruitVisualFactory } from '../entities/Fruit';
import type { TrailPoint } from '../mechanics/SlashController';
import type { ExplosionSoundVariant } from '../shop/ShopItem';
import type { ExplosionRuntimeStyle } from './ExplosionEffectFactory';
import type { SlashRuntimeStyle } from './SlashEffectFactory';
import type { TrailRuntimeStyle } from './TrailEffectFactory';

const MAX_TRAIL_POINTS = 96;
const MAX_TEXT_TEXTURES = 48;
const TRAIL_Z = 2.2;
const UP = new THREE.Vector3(0, 1, 0);
const MAX_PARTICLES = GAME_CONFIG.effects.maxParticles;
const FALLBACK_SLASH_CORE = new THREE.Color(0xf2feff);
const FALLBACK_SLASH_EDGE = new THREE.Color(0x35c9ff);

export interface BombExplosionFeedback {
  shakeStrength: number;
  shakeDuration: number;
  sound: ExplosionSoundVariant;
}

interface HalfEffect {
  group: THREE.Group;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
  maxLife: number;
  materials: THREE.MeshStandardMaterial[];
}

interface SpriteEffect {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  life: number;
  maxLife: number;
  startScale: THREE.Vector2;
  endScale: THREE.Vector2;
  startOpacity: number;
  velocity: THREE.Vector3;
}

interface RingEffect {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
}

interface TextEffect {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  textureKey: string;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

interface Particle {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  gravityScale: number;
  drag: number;
  color: THREE.Color;
}

export class EffectsManager {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly fruitFactory: FruitVisualFactory;
  private readonly halves: HalfEffect[] = [];
  private readonly sprites: SpriteEffect[] = [];
  private readonly rings: RingEffect[] = [];
  private readonly texts: TextEffect[] = [];

  private readonly particles: Particle[] = [];
  private readonly particlePositions: Float32Array;
  private readonly particleColors: Float32Array;
  private readonly particleSizes: Float32Array;
  private readonly particleAlphas: Float32Array;
  private readonly particleGeometry: THREE.BufferGeometry;
  private readonly particleMaterial: THREE.ShaderMaterial;
  private readonly particlePoints: THREE.Points;

  private readonly trailMesh: THREE.Mesh;
  private readonly trailGeometry: THREE.BufferGeometry;
  private readonly trailMaterial: THREE.MeshBasicMaterial;
  private readonly trailPositions: Float32Array;
  private readonly trailColors: Float32Array;
  private readonly cameraPosition = new THREE.Vector3();
  private readonly tempWorld = new THREE.Vector3();
  private readonly tempDirection = new THREE.Vector3();
  private readonly trailOuterLeft = new THREE.Vector3();
  private readonly trailOuterRight = new THREE.Vector3();
  private readonly trailInnerLeft = new THREE.Vector3();
  private readonly trailInnerRight = new THREE.Vector3();
  private readonly trailAnchor = new THREE.Vector3();
  private readonly sliceDomeGeometry = new THREE.SphereGeometry(
    1,
    22,
    14,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  private readonly sliceCapGeometry = new THREE.CircleGeometry(1, 28);
  private readonly ringGeometry = new THREE.RingGeometry(0.8, 1, 64);

  private readonly glowTexture: THREE.CanvasTexture;
  private readonly textTextures = new Map<string, THREE.CanvasTexture>();
  private readonly activeTextKeys = new Map<string, number>();

  private slashStyle: SlashRuntimeStyle | null = null;
  private explosionStyle: ExplosionRuntimeStyle | null = null;
  private trailStyle: TrailRuntimeStyle | null = null;
  private eventSlashCore: THREE.Color | null = null;
  private eventSlashEdge: THREE.Color | null = null;
  private slashSparkAccumulator = 0;
  private visualTime = 0;
  private readonly trailTimers = new WeakMap<Fruit | Bomb, number>();
  private readonly sparkAnchor = new THREE.Vector3();
  private readonly rainbowColor = new THREE.Color();
  private readonly rainbowColors: THREE.Color[] = [this.rainbowColor];
  private readonly tempColor = new THREE.Color();

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    fruitFactory: FruitVisualFactory,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.fruitFactory = fruitFactory;
    this.glowTexture = createGlowTexture();

    for (let index = 0; index < MAX_PARTICLES; index += 1) {
      this.particles.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: 0.2,
        gravityScale: 1,
        drag: 0,
        color: new THREE.Color(),
      });
    }
    this.particlePositions = new Float32Array(MAX_PARTICLES * 3);
    this.particleColors = new Float32Array(MAX_PARTICLES * 3);
    this.particleSizes = new Float32Array(MAX_PARTICLES);
    this.particleAlphas = new Float32Array(MAX_PARTICLES);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.particlePositions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.particleGeometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(this.particleColors, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.particleGeometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(this.particleSizes, 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.particleGeometry.setAttribute(
      'aAlpha',
      new THREE.BufferAttribute(this.particleAlphas, 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );

    this.particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        uniform float uPixelRatio;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * 420.0 * uPixelRatio / max(1.0, -viewPosition.z);
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float distanceToCenter = length(gl_PointCoord - vec2(0.5));
          float alpha = smoothstep(0.5, 0.05, distanceToCenter) * vAlpha;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });
    this.particlePoints = new THREE.Points(
      this.particleGeometry,
      this.particleMaterial,
    );
    this.particlePoints.frustumCulled = false;
    this.particlePoints.renderOrder = 12;
    this.scene.add(this.particlePoints);

    this.trailPositions = new Float32Array(MAX_TRAIL_POINTS * 4 * 3);
    this.trailColors = new Float32Array(MAX_TRAIL_POINTS * 4 * 3);
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailPositions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.trailGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.trailColors, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const indices = new Uint16Array((MAX_TRAIL_POINTS - 1) * 12);
    let offset = 0;
    for (let index = 0; index < MAX_TRAIL_POINTS - 1; index += 1) {
      const start = index * 4;
      const next = (index + 1) * 4;
      indices.set(
        [
          start,
          start + 1,
          next + 1,
          start,
          next + 1,
          next,
          start + 2,
          start + 3,
          next + 3,
          start + 2,
          next + 3,
          next + 2,
        ],
        offset,
      );
      offset += 12;
    }
    this.trailGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
    this.trailGeometry.setDrawRange(0, 0);
    this.trailMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.trailMesh = new THREE.Mesh(this.trailGeometry, this.trailMaterial);
    this.trailMesh.frustumCulled = false;
    this.trailMesh.renderOrder = 30;
    this.trailMesh.visible = false;
    this.scene.add(this.trailMesh);
  }

  setSlashStyle(style: SlashRuntimeStyle | null): void {
    this.slashStyle = style;
  }

  setExplosionStyle(style: ExplosionRuntimeStyle | null): void {
    this.explosionStyle = style;
  }

  setTrailStyle(style: TrailRuntimeStyle | null): void {
    this.trailStyle = style;
  }

  /**
   * Overlays an event colour on the equipped slash effect without touching the
   * saved loadout. Pass nulls to restore the purchased colours.
   */
  setEventSlashTint(core: number | null, edge: number | null): void {
    this.eventSlashCore = core === null ? null : new THREE.Color(core);
    this.eventSlashEdge = edge === null ? null : new THREE.Color(edge);
  }

  spawnEventCelebration(color: number, intensity = 1): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width <= 0 || height <= 0) {
      return;
    }
    this.cameraPosition.copy(this.camera.position);
    this.screenToTrailWorld(width * 0.5, height * 0.34, width, height, this.tempWorld);
    const position = this.tempWorld.clone();
    this.addFlash(
      position.clone().add(new THREE.Vector3(0, 0, 0.5)),
      color,
      new THREE.Vector2(1.4, 1.4).multiplyScalar(intensity),
      new THREE.Vector2(8, 8).multiplyScalar(intensity),
      0.46,
      0.8,
      Math.random() * Math.PI,
    );
    this.addRing(position, color, 0.6, 7.5 * intensity, 0.55);
    this.addRing(position, color, 0.3, 4.2 * intensity, 0.38);
    this.spawnParticles(
      position,
      [new THREE.Color(color), new THREE.Color(0xffffff)],
      Math.round(18 * intensity),
      {
        speedMin: 1.5,
        speedMax: 6.5,
        sizeMin: 0.08,
        sizeMax: 0.3,
        lifeMin: 0.3,
        lifeMax: 0.85,
        gravityScale: 0.25,
        drag: 1.4,
      },
    );
  }

  /** Creates one of each transient effect so its shader compiles up front. */
  prewarm(): void {
    const origin = new THREE.Vector3(0, 0, 40);
    this.addFlash(
      origin,
      0xffffff,
      new THREE.Vector2(0.1, 0.1),
      new THREE.Vector2(0.1, 0.1),
      0.1,
      0.1,
      0,
    );
    this.addRing(origin, 0xffffff, 0.1, 0.1, 0.1);
    this.spawnFloatingText('+0', '#ffe27a', origin);
    // The trail is hidden while idle, so the compile pass would otherwise skip
    // its material. Draw range 0 keeps it invisible; reset() hides it again.
    this.trailMesh.visible = true;
  }

  update(deltaSeconds: number): void {
    this.visualTime += deltaSeconds;
    this.updateHalves(deltaSeconds);
    this.updateSprites(deltaSeconds);
    this.updateRings(deltaSeconds);
    this.updateTexts(deltaSeconds);
    this.updateParticles(deltaSeconds);
  }

  spawnFruitSlice(fruit: Fruit, slashDirection: THREE.Vector3): void {
    const radius = fruit.radius;
    const position = fruit.group.position.clone();
    const separation = new THREE.Vector3(
      -slashDirection.y,
      slashDirection.x,
      0,
    );
    if (separation.lengthSq() < 0.001) {
      separation.set(0, 1, 0);
    }
    separation.normalize();
    if (Math.random() < 0.5) {
      separation.negate();
    }
    const roll = Math.random() * Math.PI * 2;

    for (const side of [1, -1]) {
      const domeDirection = separation.clone().multiplyScalar(side);
      const outerMaterial = this.fruitFactory.createSliceOuterMaterial(
        fruit.definition,
      );
      outerMaterial.transparent = true;
      const fleshMaterial = new THREE.MeshStandardMaterial({
        color: fruit.definition.fleshColor,
        emissive: new THREE.Color(fruit.definition.fleshColor),
        emissiveIntensity: 0.3,
        roughness: 0.58,
        metalness: 0.02,
        side: THREE.DoubleSide,
        transparent: true,
      });

      const group = new THREE.Group();
      const dome = new THREE.Mesh(this.sliceDomeGeometry, outerMaterial);
      dome.castShadow = true;
      dome.scale.setScalar(radius);
      const cap = new THREE.Mesh(this.sliceCapGeometry, fleshMaterial);
      cap.scale.setScalar(radius * 0.985);
      cap.rotation.x = Math.PI / 2;
      cap.position.y = 0.001;
      group.add(dome, cap);
      group.position.copy(position);
      group.quaternion.setFromUnitVectors(UP, domeDirection);
      group.rotateY(roll);

      this.scene.add(group);
      this.halves.push({
        group,
        velocity: fruit.velocity
          .clone()
          .multiplyScalar(0.55)
          .addScaledVector(domeDirection, 2.6 + Math.random() * 1.2)
          .add(new THREE.Vector3(0, 1.2, 0)),
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 7,
          (Math.random() - 0.5) * 7,
          (Math.random() - 0.5) * 7,
        ),
        life: 1.35,
        maxLife: 1.35,
        materials: [outerMaterial, fleshMaterial],
      });
    }

    const flashRotation = Math.atan2(-slashDirection.y, slashDirection.x);
    this.addFlash(
      position.clone().add(new THREE.Vector3(0, 0, 0.6)),
      0xffffff,
      new THREE.Vector2(radius * 4.2, radius * 1.1),
      new THREE.Vector2(radius * 6.5, radius * 0.18),
      0.18,
      0.9,
      flashRotation,
    );

    const juiceColors = [
      new THREE.Color(fruit.definition.fleshColor),
      new THREE.Color(fruit.definition.accentColor),
      new THREE.Color(0xfff6e8),
    ];
    this.spawnParticles(position, juiceColors, 16, {
      speedMin: 1.2,
      speedMax: 5,
      sizeMin: 0.12,
      sizeMax: 0.34,
      lifeMin: 0.35,
      lifeMax: 0.85,
      gravityScale: 0.85,
      drag: 1.4,
    });
    this.spawnParticles(position, [new THREE.Color(0xffffff)], 5, {
      speedMin: 4,
      speedMax: 8,
      sizeMin: 0.06,
      sizeMax: 0.14,
      lifeMin: 0.15,
      lifeMax: 0.3,
      gravityScale: 0.3,
      drag: 3,
    });
  }

  spawnBombExplosion(position: THREE.Vector3): BombExplosionFeedback {
    const style = this.explosionStyle;
    const flashColor = style?.flashColor ?? 0xffa347;
    const ringColors =
      style && style.ringColors.length > 0
        ? style.ringColors
        : [0xffd166, 0xff5d3b];
    const particleColors =
      style && style.particleColors.length > 0
        ? style.particleColors
        : [
            new THREE.Color(0xffdd7a),
            new THREE.Color(0xff9a3c),
            new THREE.Color(0xff5533),
            new THREE.Color(0xffffff),
          ];
    const sparkColors =
      style && style.sparkColors.length > 0
        ? style.sparkColors
        : [new THREE.Color(0xffe9b0)];

    this.addFlash(
      position.clone().add(new THREE.Vector3(0, 0, 0.8)),
      flashColor,
      new THREE.Vector2(2, 2),
      new THREE.Vector2(12, 12),
      0.42,
      0.95,
      Math.random() * Math.PI,
    );
    ringColors.slice(0, 4).forEach((color, index) => {
      this.addRing(
        position,
        color,
        Math.max(0.2, 0.5 - index * 0.1),
        8 + index * 3,
        0.45 + index * 0.15,
      );
    });

    this.spawnParticles(position, particleColors, style?.particleCount ?? 38, {
      speedMin: 2.5,
      speedMax: 10,
      sizeMin: 0.16,
      sizeMax: 0.5,
      lifeMin: 0.4,
      lifeMax: 1,
      gravityScale: 0.5,
      drag: 1.3,
    });
    this.spawnParticles(position, sparkColors, style?.sparkCount ?? 14, {
      speedMin: 6,
      speedMax: 14,
      sizeMin: 0.05,
      sizeMax: 0.13,
      lifeMin: 0.2,
      lifeMax: 0.5,
      gravityScale: 0.9,
      drag: 0.6,
    });

    return {
      shakeStrength: style?.shakeStrength ?? 0.5,
      shakeDuration: style?.shakeDuration ?? 0.55,
      sound: style?.sound ?? 'classic',
    };
  }

  updateEntityTrails(
    deltaSeconds: number,
    fruits: readonly Fruit[],
    bombs: readonly Bomb[],
  ): void {
    const style = this.trailStyle;
    if (!style || style.colors.length === 0 || style.maxEmitters <= 0) {
      return;
    }
    let emitted = 0;
    for (const fruit of fruits) {
      if (emitted >= style.maxEmitters) {
        return;
      }
      if (fruit.sliced || fruit.missed) {
        continue;
      }
      emitted += this.emitTrail(deltaSeconds, style, fruit, fruit.group.position);
    }
    for (const bomb of bombs) {
      if (emitted >= style.maxEmitters) {
        return;
      }
      if (bomb.exploded) {
        continue;
      }
      emitted += this.emitTrail(deltaSeconds, style, bomb, bomb.group.position);
    }
  }

  updateSlashSparks(deltaSeconds: number): void {
    const style = this.slashStyle;
    if (
      !style ||
      style.sparkColors.length === 0 ||
      style.sparkRate <= 0 ||
      !this.trailMesh.visible
    ) {
      this.slashSparkAccumulator = 0;
      return;
    }
    this.slashSparkAccumulator = Math.min(
      3,
      this.slashSparkAccumulator + deltaSeconds * style.sparkRate,
    );
    let spawnCount = Math.floor(this.slashSparkAccumulator);
    if (spawnCount <= 0) {
      return;
    }
    spawnCount = Math.min(spawnCount, 3);
    this.slashSparkAccumulator -= spawnCount;
    this.spawnParticles(this.sparkAnchor, style.sparkColors, spawnCount, {
      speedMin: 1.2,
      speedMax: 4.2,
      sizeMin: 0.04,
      sizeMax: 0.12,
      lifeMin: 0.15,
      lifeMax: 0.38,
      gravityScale: 0.35,
      drag: 2.2,
    });
  }

  spawnFloatingText(
    text: string,
    color: string,
    position: THREE.Vector3,
  ): void {
    const textureKey = `${text}|${color}`;
    const texture = this.getTextTexture(textureKey, text, color);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position).add(new THREE.Vector3(0, 0.5, 0.8));
    sprite.scale.set(1.9, 0.95, 1);
    sprite.renderOrder = 40;
    this.scene.add(sprite);
    this.activeTextKeys.set(
      textureKey,
      (this.activeTextKeys.get(textureKey) ?? 0) + 1,
    );
    this.texts.push({
      sprite,
      material,
      textureKey,
      life: 1.05,
      maxLife: 1.05,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        1.15,
        0,
      ),
    });
  }

  updateSlashTrail(
    points: readonly TrailPoint[],
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    if (points.length < 2 || viewportWidth <= 0 || viewportHeight <= 0) {
      this.hideSlashTrail();
      return;
    }

    const now = performance.now();
    const style = this.slashStyle;
    const lifetimeMs =
      (style?.lifetime ?? GAME_CONFIG.slash.trailLifetime) * 1000;
    const widthScale = style?.widthScale ?? 1;
    const count = Math.min(points.length, MAX_TRAIL_POINTS);
    const startIndex = points.length - count;
    this.cameraPosition.copy(this.camera.position);

    let vertexIndex = 0;
    for (let index = 0; index < count; index += 1) {
      const point = points[startIndex + index];
      const age = Math.min(1, Math.max(0, (now - point.time) / lifetimeMs));
      const fade = Math.pow(1 - age, 1.35);
      if (fade <= 0.01) {
        continue;
      }

      const previous =
        index > 0
          ? points[startIndex + index - 1]
          : points[startIndex + index + 1] ?? point;
      const next =
        index < count - 1
          ? points[startIndex + index + 1]
          : points[startIndex + index - 1] ?? point;
      let tangentX = next.x - previous.x;
      let tangentY = next.y - previous.y;
      const tangentLength = Math.hypot(tangentX, tangentY);
      if (tangentLength < 0.0001) {
        tangentX = 1;
        tangentY = 0;
      } else {
        tangentX /= tangentLength;
        tangentY /= tangentLength;
      }
      const perpendicularX = -tangentY;
      const perpendicularY = tangentX;

      const outerWidth = (4 + 27 * fade) * 0.5 * widthScale;
      const innerWidth = (1 + 11 * fade) * 0.5 * widthScale;

      this.screenToTrailWorld(
        point.x + perpendicularX * outerWidth,
        point.y + perpendicularY * outerWidth,
        viewportWidth,
        viewportHeight,
        this.trailOuterLeft,
      );
      this.screenToTrailWorld(
        point.x - perpendicularX * outerWidth,
        point.y - perpendicularY * outerWidth,
        viewportWidth,
        viewportHeight,
        this.trailOuterRight,
      );
      this.screenToTrailWorld(
        point.x + perpendicularX * innerWidth,
        point.y + perpendicularY * innerWidth,
        viewportWidth,
        viewportHeight,
        this.trailInnerLeft,
      );
      this.screenToTrailWorld(
        point.x - perpendicularX * innerWidth,
        point.y - perpendicularY * innerWidth,
        viewportWidth,
        viewportHeight,
        this.trailInnerRight,
      );

      for (let vertex = 0; vertex < 4; vertex += 1) {
        const position = vertexIndex * 3;
        const source =
          vertex === 0
            ? this.trailOuterLeft
            : vertex === 1
              ? this.trailOuterRight
              : vertex === 2
                ? this.trailInnerLeft
                : this.trailInnerRight;
        this.trailPositions[position] = source.x;
        this.trailPositions[position + 1] = source.y;
        this.trailPositions[position + 2] = source.z;
        const colorBase = vertex < 2 ? 0.78 : 1;
        if (style?.rainbow) {
          this.tempColor.setHSL(
            (this.visualTime * 0.75 + index / Math.max(1, count) * 0.65) % 1,
            0.98,
            vertex < 2 ? 0.58 : 0.82,
          );
        } else {
          this.tempColor.copy(
            vertex < 2
              ? this.eventSlashEdge ??
                  style?.edgeColor ??
                  FALLBACK_SLASH_EDGE
              : this.eventSlashCore ??
                  style?.coreColor ??
                  FALLBACK_SLASH_CORE,
          );
        }
        this.trailColors[position] = this.tempColor.r * fade * colorBase;
        this.trailColors[position + 1] = this.tempColor.g * fade * colorBase;
        this.trailColors[position + 2] = this.tempColor.b * fade * colorBase;
        vertexIndex += 1;
      }
    }

    const lastPoint = points[points.length - 1];
    this.screenToTrailWorld(
      lastPoint.x,
      lastPoint.y,
      viewportWidth,
      viewportHeight,
      this.trailAnchor,
    );
    this.sparkAnchor.copy(this.trailAnchor);

    if (vertexIndex < 8) {
      this.hideSlashTrail();
      return;
    }

    const positionAttribute = this.trailGeometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    const colorAttribute = this.trailGeometry.getAttribute(
      'color',
    ) as THREE.BufferAttribute;
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    this.trailGeometry.setDrawRange(0, (vertexIndex / 4 - 1) * 12);
    this.trailMesh.visible = true;
  }

  hideSlashTrail(): void {
    this.trailMesh.visible = false;
    this.trailGeometry.setDrawRange(0, 0);
  }

  reset(): void {
    for (const half of this.halves) {
      this.disposeHalf(half);
    }
    this.halves.length = 0;
    for (const effect of this.sprites) {
      this.scene.remove(effect.sprite);
      effect.material.dispose();
    }
    this.sprites.length = 0;
    for (const ring of this.rings) {
      this.scene.remove(ring.mesh);
      ring.material.dispose();
    }
    this.rings.length = 0;
    for (const text of this.texts) {
      this.scene.remove(text.sprite);
      text.material.dispose();
      this.releaseTextKey(text.textureKey);
    }
    this.texts.length = 0;
    this.activeTextKeys.clear();
    for (const particle of this.particles) {
      particle.active = false;
    }
    for (let index = 0; index < MAX_PARTICLES; index += 1) {
      this.particleAlphas[index] = 0;
    }
    const alphaAttribute = this.particleGeometry.getAttribute(
      'aAlpha',
    ) as THREE.BufferAttribute;
    alphaAttribute.needsUpdate = true;
    this.hideSlashTrail();
    this.eventSlashCore = null;
    this.eventSlashEdge = null;
    this.slashSparkAccumulator = 0;
    this.visualTime = 0;
  }

  dispose(): void {
    this.reset();
    this.scene.remove(this.particlePoints);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.scene.remove(this.trailMesh);
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.sliceDomeGeometry.dispose();
    this.sliceCapGeometry.dispose();
    this.ringGeometry.dispose();
    this.glowTexture.dispose();
    for (const texture of this.textTextures.values()) {
      texture.dispose();
    }
    this.textTextures.clear();
  }

  private updateHalves(deltaSeconds: number): void {
    for (let index = this.halves.length - 1; index >= 0; index -= 1) {
      const effect = this.halves[index];
      effect.life -= deltaSeconds;
      if (effect.life <= 0) {
        this.disposeHalf(effect);
        this.halves.splice(index, 1);
        continue;
      }
      effect.velocity.y -= GAME_CONFIG.gravity * 0.75 * deltaSeconds;
      effect.group.position.addScaledVector(effect.velocity, deltaSeconds);
      effect.group.rotation.x += effect.spin.x * deltaSeconds;
      effect.group.rotation.y += effect.spin.y * deltaSeconds;
      effect.group.rotation.z += effect.spin.z * deltaSeconds;
      const fade = Math.min(1, effect.life / 0.35);
      for (const material of effect.materials) {
        material.opacity = fade;
      }
    }
  }

  private updateSprites(deltaSeconds: number): void {
    for (let index = this.sprites.length - 1; index >= 0; index -= 1) {
      const effect = this.sprites[index];
      effect.life -= deltaSeconds;
      if (effect.life <= 0) {
        this.scene.remove(effect.sprite);
        effect.material.dispose();
        this.sprites.splice(index, 1);
        continue;
      }
      const progress = 1 - effect.life / effect.maxLife;
      const eased = 1 - Math.pow(1 - progress, 2.2);
      effect.sprite.position.addScaledVector(effect.velocity, deltaSeconds);
      effect.sprite.scale.set(
        THREE.MathUtils.lerp(effect.startScale.x, effect.endScale.x, eased),
        THREE.MathUtils.lerp(effect.startScale.y, effect.endScale.y, eased),
        1,
      );
      effect.material.opacity =
        effect.startOpacity * Math.pow(1 - progress, 1.4);
    }
  }

  private updateRings(deltaSeconds: number): void {
    for (let index = this.rings.length - 1; index >= 0; index -= 1) {
      const ring = this.rings[index];
      ring.life -= deltaSeconds;
      if (ring.life <= 0) {
        this.scene.remove(ring.mesh);
        ring.material.dispose();
        this.rings.splice(index, 1);
        continue;
      }
      const progress = 1 - ring.life / ring.maxLife;
      const eased = 1 - Math.pow(1 - progress, 2.5);
      const scale = THREE.MathUtils.lerp(ring.startScale, ring.endScale, eased);
      ring.mesh.scale.setScalar(scale);
      ring.material.opacity = Math.pow(1 - progress, 1.8) * 0.85;
    }
  }

  private updateTexts(deltaSeconds: number): void {
    for (let index = this.texts.length - 1; index >= 0; index -= 1) {
      const text = this.texts[index];
      text.life -= deltaSeconds;
      if (text.life <= 0) {
        this.scene.remove(text.sprite);
        text.material.dispose();
        this.releaseTextKey(text.textureKey);
        this.texts.splice(index, 1);
        continue;
      }
      const progress = 1 - text.life / text.maxLife;
      text.sprite.position.addScaledVector(text.velocity, deltaSeconds);
      text.material.opacity =
        progress < 0.12
          ? progress / 0.12
          : Math.min(1, text.life / 0.4);
    }
  }

  private updateParticles(deltaSeconds: number): void {
    let changed = false;
    for (let index = 0; index < this.particles.length; index += 1) {
      const particle = this.particles[index];
      if (!particle.active) {
        continue;
      }
      particle.life -= deltaSeconds;
      if (particle.life <= 0) {
        particle.active = false;
        this.particleAlphas[index] = 0;
        changed = true;
        continue;
      }
      particle.velocity.y -= GAME_CONFIG.gravity * particle.gravityScale * deltaSeconds;
      const dragFactor = Math.max(0, 1 - particle.drag * deltaSeconds);
      particle.velocity.multiplyScalar(dragFactor);
      particle.position.addScaledVector(particle.velocity, deltaSeconds);

      const positionIndex = index * 3;
      this.particlePositions[positionIndex] = particle.position.x;
      this.particlePositions[positionIndex + 1] = particle.position.y;
      this.particlePositions[positionIndex + 2] = particle.position.z;
      this.particleColors[positionIndex] = particle.color.r;
      this.particleColors[positionIndex + 1] = particle.color.g;
      this.particleColors[positionIndex + 2] = particle.color.b;
      this.particleSizes[index] = particle.size;
      this.particleAlphas[index] =
        Math.pow(particle.life / particle.maxLife, 1.2) * 0.95;
      changed = true;
    }

    if (!changed) {
      return;
    }
    const positionAttribute = this.particleGeometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    const colorAttribute = this.particleGeometry.getAttribute(
      'aColor',
    ) as THREE.BufferAttribute;
    const sizeAttribute = this.particleGeometry.getAttribute(
      'aSize',
    ) as THREE.BufferAttribute;
    const alphaAttribute = this.particleGeometry.getAttribute(
      'aAlpha',
    ) as THREE.BufferAttribute;
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    sizeAttribute.needsUpdate = true;
    alphaAttribute.needsUpdate = true;
  }

  private emitTrail(
    deltaSeconds: number,
    style: TrailRuntimeStyle,
    entity: Fruit | Bomb,
    position: THREE.Vector3,
  ): number {
    const timer = (this.trailTimers.get(entity) ?? 0) - deltaSeconds;
    if (timer > 0) {
      this.trailTimers.set(entity, timer);
      return 0;
    }
    this.trailTimers.set(
      entity,
      style.intervalSeconds * (0.7 + Math.random() * 0.6),
    );
    let colors = style.colors;
    if (style.rainbow) {
      this.rainbowColor.setHSL((this.visualTime * 0.4) % 1, 0.95, 0.68);
      colors = this.rainbowColors;
    }
    this.spawnParticles(position, colors, 1, {
      speedMin: 0.2,
      speedMax: 1.2,
      sizeMin: style.sizeMin,
      sizeMax: style.sizeMax,
      lifeMin: style.lifeMin,
      lifeMax: style.lifeMax,
      gravityScale: style.gravityScale,
      drag: style.drag,
    });
    return 1;
  }

  private spawnParticles(
    origin: THREE.Vector3,
    colors: THREE.Color[],
    count: number,
    options: {
      speedMin: number;
      speedMax: number;
      sizeMin: number;
      sizeMax: number;
      lifeMin: number;
      lifeMax: number;
      gravityScale: number;
      drag: number;
    },
  ): void {
    let spawned = 0;
    for (let index = 0; index < this.particles.length && spawned < count; index += 1) {
      const particle = this.particles[index];
      if (particle.active) {
        continue;
      }
      spawned += 1;
      let directionX = Math.random() * 2 - 1;
      let directionY = Math.random() * 2 - 1;
      let directionZ = Math.random() * 2 - 1;
      const lengthSq =
        directionX * directionX + directionY * directionY + directionZ * directionZ;
      if (lengthSq < 0.001) {
        directionX = 0;
        directionY = 1;
        directionZ = 0;
      } else {
        const length = Math.sqrt(lengthSq);
        directionX /= length;
        directionY /= length;
        directionZ /= length;
      }
      const speed = THREE.MathUtils.randFloat(options.speedMin, options.speedMax);
      particle.active = true;
      particle.position.copy(origin);
      particle.velocity
        .set(directionX, directionY, directionZ)
        .multiplyScalar(speed);
      particle.velocity.y += Math.random() * 1.2;
      particle.life = THREE.MathUtils.randFloat(options.lifeMin, options.lifeMax);
      particle.maxLife = particle.life;
      particle.size = THREE.MathUtils.randFloat(options.sizeMin, options.sizeMax);
      particle.gravityScale = options.gravityScale;
      particle.drag = options.drag;
      particle.color.copy(colors[Math.floor(Math.random() * colors.length)]);
      const positionIndex = index * 3;
      this.particlePositions[positionIndex] = particle.position.x;
      this.particlePositions[positionIndex + 1] = particle.position.y;
      this.particlePositions[positionIndex + 2] = particle.position.z;
      this.particleColors[positionIndex] = particle.color.r;
      this.particleColors[positionIndex + 1] = particle.color.g;
      this.particleColors[positionIndex + 2] = particle.color.b;
      this.particleSizes[index] = particle.size;
      this.particleAlphas[index] = 0.95;
    }
  }

  private addFlash(
    position: THREE.Vector3,
    color: number,
    startScale: THREE.Vector2,
    endScale: THREE.Vector2,
    duration: number,
    opacity: number,
    rotation: number,
  ): void {
    const material = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    material.rotation = rotation;
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(startScale.x, startScale.y, 1);
    sprite.renderOrder = 35;
    this.scene.add(sprite);
    this.sprites.push({
      sprite,
      material,
      life: duration,
      maxLife: duration,
      startScale,
      endScale,
      startOpacity: opacity,
      velocity: new THREE.Vector3(),
    });
  }

  private addRing(
    position: THREE.Vector3,
    color: number,
    startScale: number,
    endScale: number,
    duration: number,
  ): void {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(this.ringGeometry, material);
    mesh.position.copy(position).add(new THREE.Vector3(0, 0, 0.9));
    mesh.scale.setScalar(startScale);
    mesh.renderOrder = 34;
    this.scene.add(mesh);
    this.rings.push({
      mesh,
      material,
      life: duration,
      maxLife: duration,
      startScale,
      endScale,
    });
  }

  private disposeHalf(effect: HalfEffect): void {
    this.scene.remove(effect.group);
    for (const material of effect.materials) {
      material.dispose();
    }
  }

  private screenToTrailWorld(
    x: number,
    y: number,
    viewportWidth: number,
    viewportHeight: number,
    target: THREE.Vector3,
  ): void {
    const ndcX = (x / viewportWidth) * 2 - 1;
    const ndcY = -(y / viewportHeight) * 2 + 1;
    this.tempWorld.set(ndcX, ndcY, 0.5).unproject(this.camera);
    this.tempDirection.copy(this.tempWorld).sub(this.cameraPosition).normalize();
    const distanceToPlane = (TRAIL_Z - this.cameraPosition.z) / this.tempDirection.z;
    target
      .copy(this.cameraPosition)
      .addScaledVector(this.tempDirection, distanceToPlane);
  }

  private releaseTextKey(key: string): void {
    const count = this.activeTextKeys.get(key);
    if (count === undefined) {
      return;
    }
    if (count <= 1) {
      this.activeTextKeys.delete(key);
    } else {
      this.activeTextKeys.set(key, count - 1);
    }
  }

  private getTextTexture(
    key: string,
    text: string,
    color: string,
  ): THREE.CanvasTexture {
    const cached = this.textTextures.get(key);
    if (cached) {
      return cached;
    }
    if (this.textTextures.size >= MAX_TEXT_TEXTURES) {
      for (const [existingKey, texture] of this.textTextures) {
        if (
          existingKey === key ||
          (this.activeTextKeys.get(existingKey) ?? 0) > 0
        ) {
          continue;
        }
        this.textTextures.delete(existingKey);
        texture.dispose();
        break;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is not available.');
    }
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 64px "Segoe UI", system-ui, sans-serif';
    context.lineWidth = 9;
    context.strokeStyle = 'rgba(12, 6, 24, 0.9)';
    context.strokeText(text, 128, 66);
    context.shadowColor = color;
    context.shadowBlur = 13;
    context.fillStyle = color;
    context.fillText(text, 128, 66);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textTextures.set(key, texture);
    return texture;
  }
}

function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available.');
  }
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.65, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
