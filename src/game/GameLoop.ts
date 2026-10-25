export class GameLoop {
  private frameId = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly onFrame: (deltaSeconds: number) => void,
    private readonly maxDelta = 0.05,
  ) {}

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  private readonly tick = (now: number): void => {
    if (!this.running) {
      return;
    }
    const delta = Math.min((now - this.lastTime) / 1000, this.maxDelta);
    this.lastTime = now;
    this.onFrame(Math.max(delta, 0));
    this.frameId = requestAnimationFrame(this.tick);
  };
}
