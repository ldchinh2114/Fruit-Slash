import { GAME_CONFIG } from '../config/gameConfig';

export class ScoreManager {
  private currentScore = 0;

  get score(): number {
    return this.currentScore;
  }

  addFruit(points: number): number {
    this.currentScore += Math.max(0, Math.floor(points));
    return this.currentScore;
  }

  addBonus(points: number): number {
    return this.addFruit(points);
  }

  penalizeMiss(
    points: number,
    factor: number = GAME_CONFIG.score.missPenaltyFactor,
  ): number {
    const safeFactor = Math.min(1, Math.max(0, factor));
    const penalty = Math.floor(Math.max(0, points) * safeFactor);
    this.currentScore = Math.max(0, this.currentScore - penalty);
    return penalty;
  }

  reset(): void {
    this.currentScore = 0;
  }
}
