import { GAME_CONFIG } from '../config/gameConfig';
import type { ScreenPoint, SlashSegment } from './SlashTypes';

export interface TrailPoint extends ScreenPoint {
  time: number;
}

const MAX_TRAIL_POINTS = 96;
const MIN_POINT_DISTANCE_SQ =
  GAME_CONFIG.slash.minPointDistancePx * GAME_CONFIG.slash.minPointDistancePx;

export class SlashController {
  private readonly canvas: HTMLElement;
  private enabled = false;
  private activePointerId: number | null = null;
  private lastPoint: ScreenPoint | null = null;
  private pendingSegments: SlashSegment[] = [];
  private trail: TrailPoint[] = [];
  private trailLifetime: number = GAME_CONFIG.slash.trailLifetime;
  private strokeCounter = 0;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    canvas.addEventListener('pointerdown', this.handlePointerDown, {
      passive: false,
    });
    canvas.addEventListener('pointermove', this.handlePointerMove, {
      passive: false,
    });
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('lostpointercapture', this.handlePointerUp);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  get trailPoints(): readonly TrailPoint[] {
    return this.trail;
  }

  /** Changes once per pointer stroke so slice-wide achievements stay grouped. */
  get strokeId(): number {
    return this.strokeCounter;
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    if (!enabled) {
      this.reset();
    }
  }

  setTrailLifetime(seconds: number): void {
    if (!Number.isFinite(seconds)) {
      return;
    }
    this.trailLifetime = Math.min(0.6, Math.max(0.08, seconds));
  }

  update(): void {
    if (this.trail.length === 0) {
      return;
    }
    const cutoff = performance.now() - this.trailLifetime * 1000;
    let firstValid = 0;
    while (firstValid < this.trail.length && this.trail[firstValid].time < cutoff) {
      firstValid += 1;
    }
    if (firstValid > 0) {
      this.trail.splice(0, firstValid);
    }
  }

  consumeSegments(): SlashSegment[] {
    if (this.pendingSegments.length === 0) {
      return [];
    }
    const segments = this.pendingSegments;
    this.pendingSegments = [];
    return segments;
  }

  reset(): void {
    this.releasePointer();
    this.activePointerId = null;
    this.lastPoint = null;
    this.pendingSegments = [];
    this.trail = [];
  }

  destroy(): void {
    this.reset();
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
    this.canvas.removeEventListener('lostpointercapture', this.handlePointerUp);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled || this.activePointerId !== null) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.strokeCounter += 1;
    this.lastPoint = null;
    this.trail = [];
    this.pendingSegments = [];
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail if the pointer is released during the event.
    }
    this.addPoint(event.clientX, event.clientY);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.enabled || event.pointerId !== this.activePointerId) {
      return;
    }
    event.preventDefault();
    const coalesced =
      typeof event.getCoalescedEvents === 'function'
        ? event.getCoalescedEvents()
        : [event];
    if (coalesced.length === 0) {
      this.addPoint(event.clientX, event.clientY);
      return;
    }
    for (const pointerEvent of coalesced) {
      this.addPoint(pointerEvent.clientX, pointerEvent.clientY);
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }
    if (this.enabled) {
      this.addPoint(event.clientX, event.clientY);
    }
    this.activePointerId = null;
    this.lastPoint = null;
    this.releasePointer(event.pointerId);
  };

  private readonly handleContextMenu = (event: MouseEvent): void => {
    if (this.enabled) {
      event.preventDefault();
    }
  };

  private addPoint(x: number, y: number): void {
    if (!this.lastPoint) {
      this.lastPoint = { x, y };
      this.pushTrailPoint(x, y);
      return;
    }

    const deltaX = x - this.lastPoint.x;
    const deltaY = y - this.lastPoint.y;
    if (deltaX * deltaX + deltaY * deltaY < MIN_POINT_DISTANCE_SQ) {
      return;
    }

    const from = { x: this.lastPoint.x, y: this.lastPoint.y };
    const to = { x, y };
    if (this.pendingSegments.length < GAME_CONFIG.slash.maxPendingSegments) {
      this.pendingSegments.push({ from, to });
    }
    this.lastPoint = to;
    this.pushTrailPoint(x, y);
  }

  private pushTrailPoint(x: number, y: number): void {
    this.trail.push({ x, y, time: performance.now() });
    if (this.trail.length > MAX_TRAIL_POINTS) {
      this.trail.shift();
    }
  }

  private releasePointer(pointerId?: number): void {
    const id = pointerId ?? this.activePointerId;
    if (id === null) {
      return;
    }
    if (this.canvas.hasPointerCapture(id)) {
      this.canvas.releasePointerCapture(id);
    }
  }
}
