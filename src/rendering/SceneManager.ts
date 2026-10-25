import * as THREE from 'three';
import { GAME_CONFIG, type PlayBounds } from '../config/gameConfig';
import type { BackgroundStyle } from '../shop/ShopItem';
import { BackgroundFactory, type BackgroundHandle } from './BackgroundFactory';

interface ShakeState {
  remaining: number;
  duration: number;
  strength: number;
}

function createDustTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available.');
  }
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.45, 'rgba(255,236,214,0.6)');
  gradient.addColorStop(1, 'rgba(255,214,178,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  onResize: (() => void) | null = null;

  private readonly container: HTMLElement;
  private readonly dust: THREE.Points;
  private readonly dustGeometry: THREE.BufferGeometry;
  private readonly dustMaterial: THREE.PointsMaterial;
  private readonly dustTexture: THREE.CanvasTexture;
  private readonly backdrop: THREE.Mesh;
  private readonly backdropGeometry: THREE.PlaneGeometry;
  private readonly backdropMaterial: THREE.ShadowMaterial;
  private readonly backgroundFactory = new BackgroundFactory();
  private backgroundHandle: BackgroundHandle | null = null;
  private readonly baseCameraPosition = new THREE.Vector3(
    0,
    GAME_CONFIG.camera.y,
    GAME_CONFIG.camera.landscapeZ,
  );
  private readonly shakeState: ShakeState = {
    remaining: 0,
    duration: 0,
    strength: 0,
  };
  private bounds: PlayBounds = {
    left: -8,
    right: 8,
    top: 5,
    bottom: -5,
  };
  private elapsed = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      GAME_CONFIG.camera.fov,
      1,
      0.1,
      80,
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.classList.add('game-canvas');
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0xbcd6ff, 0x2a0d3f, 1.15);
    this.scene.add(hemisphere);

    const ambient = new THREE.AmbientLight(0x8c7bb8, 0.35);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff3da, 2.7);
    sun.position.set(-4, 7.5, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -13;
    sun.shadow.camera.right = 13;
    sun.shadow.camera.top = 11;
    sun.shadow.camera.bottom = -11;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 32;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
    this.scene.add(sun.target);

    const cyanFill = new THREE.PointLight(0x69e6ff, 45, 26, 2);
    cyanFill.position.set(5.5, 3, 5);
    this.scene.add(cyanFill);

    const magentaFill = new THREE.PointLight(0xff5c9a, 38, 24, 2);
    magentaFill.position.set(-6, -3, 4);
    this.scene.add(magentaFill);

    this.backdropGeometry = new THREE.PlaneGeometry(48, 30);
    this.backdropMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
    this.backdrop = new THREE.Mesh(this.backdropGeometry, this.backdropMaterial);
    this.backdrop.position.set(0, 0.5, -4);
    this.backdrop.receiveShadow = true;
    this.scene.add(this.backdrop);

    this.dustGeometry = new THREE.BufferGeometry();
    const dustCount = 90;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let index = 0; index < dustCount; index += 1) {
      dustPositions[index * 3] = (Math.random() - 0.5) * 30;
      dustPositions[index * 3 + 1] = (Math.random() - 0.5) * 16;
      dustPositions[index * 3 + 2] = -5 + Math.random() * 8;
    }
    this.dustGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(dustPositions, 3),
    );
    this.dustTexture = createDustTexture();
    this.dustMaterial = new THREE.PointsMaterial({
      map: this.dustTexture,
      color: 0xffd8bd,
      size: 0.1,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.dust = new THREE.Points(this.dustGeometry, this.dustMaterial);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);

    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  get playBounds(): PlayBounds {
    return this.bounds;
  }

  update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    this.dust.rotation.y += deltaSeconds * 0.012;
    this.dust.position.y = Math.sin(this.elapsed * 0.18) * 0.15;

    if (this.shakeState.remaining > 0) {
      this.shakeState.remaining = Math.max(
        0,
        this.shakeState.remaining - deltaSeconds,
      );
      const falloff =
        this.shakeState.duration > 0
          ? this.shakeState.remaining / this.shakeState.duration
          : 0;
      const magnitude = this.shakeState.strength * falloff;
      this.camera.position.set(
        this.baseCameraPosition.x + (Math.random() - 0.5) * 2 * magnitude,
        this.baseCameraPosition.y + (Math.random() - 0.5) * 2 * magnitude,
        this.baseCameraPosition.z,
      );
      this.camera.lookAt(
        (Math.random() - 0.5) * magnitude * 0.4,
        this.baseCameraPosition.y + (Math.random() - 0.5) * magnitude * 0.4,
        0,
      );
      if (this.shakeState.remaining <= 0) {
        this.resetCamera();
        this.shakeState.strength = 0;
        this.shakeState.duration = 0;
      }
    }
  }

  shake(strength: number, duration: number): void {
    this.shakeState.strength = Math.max(this.shakeState.strength, strength);
    this.shakeState.duration = Math.max(this.shakeState.duration, duration);
    this.shakeState.remaining = Math.max(this.shakeState.remaining, duration);
  }

  setBackground(style: BackgroundStyle): void {
    if (this.backgroundHandle) {
      this.scene.remove(this.backgroundHandle.group);
      this.backgroundFactory.dispose(this.backgroundHandle);
      this.backgroundHandle = null;
    }
    this.backgroundHandle = this.backgroundFactory.create(style);
    this.scene.add(this.backgroundHandle.group);
    this.dustMaterial.color.setHex(style.dustColor);
  }

  /**
   * Pre-compiles every material currently in the scene so the first real frame
   * does not stall while shaders are linked.
   */
  async compile(): Promise<void> {
    let timer: number | undefined;
    try {
      await Promise.race([
        this.renderer.compileAsync(this.scene, this.camera),
        new Promise<void>((resolve) => {
          timer = window.setTimeout(resolve, 12000);
        }),
      ]);
    } catch {
      this.renderer.compile(this.scene, this.camera);
    } finally {
      window.clearTimeout(timer);
    }
  }

  /** Stops an active camera shake and restores the default view. */
  resetShake(): void {
    this.shakeState.remaining = 0;
    this.shakeState.strength = 0;
    this.shakeState.duration = 0;
    this.resetCamera();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    if (this.backgroundHandle) {
      this.scene.remove(this.backgroundHandle.group);
      this.backgroundFactory.dispose(this.backgroundHandle);
      this.backgroundHandle = null;
    }
    this.renderer.dispose();
    this.dustGeometry.dispose();
    this.dustMaterial.dispose();
    this.dustTexture.dispose();
    this.backdropGeometry.dispose();
    this.backdropMaterial.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.forceContextLoss();
  }

  private readonly handleResize = (): void => {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const aspect = width / height;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);

    let z: number = GAME_CONFIG.camera.landscapeZ;
    if (aspect < 0.72) {
      z = GAME_CONFIG.camera.portraitZ;
    } else if (aspect < 1.12) {
      z = GAME_CONFIG.camera.squareZ;
    }

    this.baseCameraPosition.set(0, GAME_CONFIG.camera.y, z);
    this.camera.fov = GAME_CONFIG.camera.fov;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.resetCamera();

    const halfHeight =
      Math.tan(THREE.MathUtils.degToRad(GAME_CONFIG.camera.fov / 2)) * z;
    this.bounds = {
      left: -halfHeight * aspect,
      right: halfHeight * aspect,
      top: GAME_CONFIG.camera.y + halfHeight,
      bottom: GAME_CONFIG.camera.y - halfHeight,
    };
    this.onResize?.();
  };

  private resetCamera(): void {
    this.camera.position.copy(this.baseCameraPosition);
    this.camera.lookAt(0, this.baseCameraPosition.y, 0);
    this.camera.updateMatrixWorld();
  }
}
