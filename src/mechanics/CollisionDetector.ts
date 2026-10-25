import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig';
import type { Bomb } from '../entities/Bomb';
import type { Fruit } from '../entities/Fruit';
import type { SlashSegment } from './SlashTypes';

export interface FruitSlashHit {
  readonly kind: 'fruit';
  readonly fruit: Fruit;
  readonly segment: SlashSegment;
}

export interface BombSlashHit {
  readonly kind: 'bomb';
  readonly bomb: Bomb;
  readonly segment: SlashSegment;
}

export type SlashHit = FruitSlashHit | BombSlashHit;

interface ScreenCircle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  hit: boolean;
  firstSegment: SlashSegment | null;
}

interface Viewport {
  readonly width: number;
  readonly height: number;
}

const screenCenter = new THREE.Vector3();
const edgeCenter = new THREE.Vector3();
const cameraRight = new THREE.Vector3();

export class CollisionDetector {
  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly getViewport: () => Viewport,
  ) {}

  detect(
    segments: readonly SlashSegment[],
    fruits: readonly Fruit[],
    bombs: readonly Bomb[],
  ): SlashHit[] {
    if (segments.length === 0) {
      return [];
    }
    const { width, height } = this.getViewport();
    if (width <= 0 || height <= 0) {
      return [];
    }

    this.camera.updateMatrixWorld();
    cameraRight.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();

    const fruitCircles: Array<{ fruit: Fruit; circle: ScreenCircle }> = [];
    for (const fruit of fruits) {
      if (fruit.sliced || fruit.missed) {
        continue;
      }
      const circle = this.projectTarget(fruit.group.position, fruit.radius, width, height);
      if (circle) {
        fruitCircles.push({ fruit, circle });
      }
    }

    const bombCircles: Array<{ bomb: Bomb; circle: ScreenCircle }> = [];
    for (const bomb of bombs) {
      if (bomb.exploded) {
        continue;
      }
      const circle = this.projectTarget(bomb.group.position, bomb.radius, width, height);
      if (circle) {
        bombCircles.push({ bomb, circle });
      }
    }

    for (const segment of segments) {
      for (const entry of fruitCircles) {
        if (!entry.circle.hit && segmentIntersectsCircle(segment, entry.circle)) {
          entry.circle.hit = true;
          entry.circle.firstSegment = segment;
        }
      }
      for (const entry of bombCircles) {
        if (!entry.circle.hit && segmentIntersectsCircle(segment, entry.circle)) {
          entry.circle.hit = true;
          entry.circle.firstSegment = segment;
        }
      }
    }

    const hits: SlashHit[] = [];
    for (const entry of fruitCircles) {
      if (entry.circle.hit && entry.circle.firstSegment) {
        hits.push({
          kind: 'fruit',
          fruit: entry.fruit,
          segment: entry.circle.firstSegment,
        });
      }
    }
    for (const entry of bombCircles) {
      if (entry.circle.hit && entry.circle.firstSegment) {
        hits.push({
          kind: 'bomb',
          bomb: entry.bomb,
          segment: entry.circle.firstSegment,
        });
      }
    }
    return hits;
  }

  /**
   * Returns the closest bomb that the slash passed near without slicing.
   * Only active slash segments are considered, so idle bombs never trigger it.
   */
  detectNearMiss(
    segments: readonly SlashSegment[],
    bombs: readonly Bomb[],
    marginPx: number,
  ): Bomb | null {
    if (segments.length === 0 || marginPx <= 0) {
      return null;
    }
    const { width, height } = this.getViewport();
    if (width <= 0 || height <= 0) {
      return null;
    }

    this.camera.updateMatrixWorld();
    cameraRight.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();

    let closest: Bomb | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const bomb of bombs) {
      if (bomb.exploded) {
        continue;
      }
      const circle = this.projectTarget(
        bomb.group.position,
        bomb.radius,
        width,
        height,
      );
      if (!circle) {
        continue;
      }
      const limit = circle.radius + marginPx;
      for (const segment of segments) {
        const distance = segmentDistanceToPoint(segment, circle.x, circle.y);
        if (distance <= circle.radius || distance > limit) {
          continue;
        }
        if (distance < closestDistance) {
          closest = bomb;
          closestDistance = distance;
        }
      }
    }
    return closest;
  }

  private projectTarget(
    worldPosition: THREE.Vector3,
    radius: number,
    width: number,
    height: number,
  ): ScreenCircle | null {
    screenCenter.copy(worldPosition).project(this.camera);
    if (screenCenter.z < -1 || screenCenter.z > 1) {
      return null;
    }
    const centerX = (screenCenter.x * 0.5 + 0.5) * width;
    const centerY = (-screenCenter.y * 0.5 + 0.5) * height;

    edgeCenter.copy(worldPosition).addScaledVector(cameraRight, radius);
    edgeCenter.project(this.camera);
    const edgeX = (edgeCenter.x * 0.5 + 0.5) * width;
    const edgeY = (-edgeCenter.y * 0.5 + 0.5) * height;

    const projectedRadius = Math.hypot(edgeX - centerX, edgeY - centerY);

    const radiusPx = Math.max(
      GAME_CONFIG.slash.minHitRadiusPx,
      projectedRadius * GAME_CONFIG.slash.hitRadiusScale,
    );

    return {
      x: centerX,
      y: centerY,
      radius: radiusPx,
      hit: false,
      firstSegment: null,
    };
  }
}

function segmentIntersectsCircle(
  segment: SlashSegment,
  circle: Pick<ScreenCircle, 'x' | 'y' | 'radius'>,
): boolean {
  return segmentDistanceToPoint(segment, circle.x, circle.y) <= circle.radius;
}

function segmentDistanceToPoint(
  segment: SlashSegment,
  pointX: number,
  pointY: number,
): number {
  const segmentX = segment.to.x - segment.from.x;
  const segmentY = segment.to.y - segment.from.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared <= 0.0001) {
    return Math.hypot(pointX - segment.from.x, pointY - segment.from.y);
  }

  let t =
    ((pointX - segment.from.x) * segmentX +
      (pointY - segment.from.y) * segmentY) /
    lengthSquared;
  t = Math.max(0, Math.min(1, t));
  const closestX = segment.from.x + segmentX * t;
  const closestY = segment.from.y + segmentY * t;
  return Math.hypot(pointX - closestX, pointY - closestY);
}
