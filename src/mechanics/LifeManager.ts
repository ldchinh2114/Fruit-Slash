export class LifeManager {
  private currentLives: number;

  constructor(startingLives: number) {
    this.currentLives = startingLives;
  }

  get lives(): number {
    return this.currentLives;
  }

  get isGameOver(): boolean {
    return this.currentLives <= 0;
  }

  loseLife(): number {
    this.currentLives = Math.max(0, this.currentLives - 1);
    return this.currentLives;
  }

  reset(startingLives: number): void {
    this.currentLives = startingLives;
  }
}
