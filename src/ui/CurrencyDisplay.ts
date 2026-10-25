import { formatScore } from './dom';

export class CurrencyDisplay {
  private target = 0;
  private current = 0;
  private frame = 0;
  private lastTime = 0;
  private readonly prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private readonly element: HTMLElement) {}

  set(value: number, animate = true): void {
    const safeValue = Math.max(0, Math.floor(value));
    if (safeValue === this.target) {
      return;
    }
    const previousTarget = this.target;
    this.target = safeValue;
    if (!animate || this.prefersReducedMotion || previousTarget === 0) {
      this.cancelAnimation();
      this.current = safeValue;
      this.element.textContent = formatScore(safeValue);
      this.bump();
      return;
    }
    this.lastTime = performance.now();
    if (this.frame === 0) {
      this.frame = requestAnimationFrame(this.animate);
    }
    this.bump();
  }

  refresh(): void {
    this.element.textContent = formatScore(this.target);
  }

  destroy(): void {
    this.cancelAnimation();
  }

  private readonly animate = (now: number): void => {
    const delta = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const difference = this.target - this.current;
    if (Math.abs(difference) < 1) {
      this.current = this.target;
      this.element.textContent = formatScore(this.target);
      this.frame = 0;
      return;
    }
    this.current += difference * Math.min(1, delta * 8.5);
    this.element.textContent = formatScore(Math.round(this.current));
    this.frame = requestAnimationFrame(this.animate);
  };

  private cancelAnimation(): void {
    if (this.frame !== 0) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  private bump(): void {
    if (this.prefersReducedMotion) {
      return;
    }
    this.element.classList.remove('is-bumping');
    void this.element.offsetWidth;
    this.element.classList.add('is-bumping');
  }
}
