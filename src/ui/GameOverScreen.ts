import { formatScore, formatTime, requireId } from './dom';
import { Screen } from './Screen';

export interface GameOverResult {
  score: number;
  timeSeconds: number;
  level: number;
  bestScore: number;
  isNewBest: boolean;
  coinsEarned: number;
  luckyCoins: number;
  coinBalance: number;
  rewardSaved: boolean;
}

export interface GameOverCallbacks {
  onRestart: () => void;
  onMenu: () => void;
  onShop: () => void;
}

export class GameOverScreen extends Screen {
  private readonly finalScore = requireId('final-score');
  private readonly finalTime = requireId('final-time');
  private readonly finalLevel = requireId('final-level');
  private readonly finalBest = requireId('final-best');
  private readonly newBest = requireId('new-best');
  private readonly finalCoins = requireId('final-coins');
  private readonly finalLucky = requireId('final-lucky');
  private readonly finalBalance = requireId('final-balance');
  private readonly rewardNote = requireId('final-reward-note');
  private readonly restartButton = requireId<HTMLButtonElement>('btn-restart');
  private readonly shopButton = requireId<HTMLButtonElement>('btn-over-shop');
  private readonly menuButton = requireId<HTMLButtonElement>('btn-menu');

  constructor(private readonly callbacks: GameOverCallbacks) {
    super('screen-over');
    this.restartButton.addEventListener('click', this.handleRestart);
    this.shopButton.addEventListener('click', this.handleShop);
    this.menuButton.addEventListener('click', this.handleMenu);
  }

  show(result: GameOverResult): void {
    this.finalScore.textContent = formatScore(result.score);
    this.finalTime.textContent = formatTime(result.timeSeconds);
    this.finalLevel.textContent = String(result.level);
    this.finalBest.textContent = formatScore(result.bestScore);
    this.newBest.hidden = !result.isNewBest;
    this.finalCoins.textContent = `+${formatScore(result.coinsEarned)}`;
    this.finalBalance.textContent = formatScore(result.coinBalance);
    if (result.luckyCoins > 0) {
      this.finalLucky.hidden = false;
      this.finalLucky.textContent = `Lucky Drop: +${formatScore(result.luckyCoins)} Coins`;
    } else {
      this.finalLucky.hidden = true;
    }
    if (!result.rewardSaved) {
      this.rewardNote.hidden = false;
      this.rewardNote.textContent =
        'Không thể lưu phần thưởng vào bộ nhớ trình duyệt. Số dư hiển thị chưa được cộng.';
      this.rewardNote.classList.add('reward-note--error');
    } else {
      this.rewardNote.hidden = true;
      this.rewardNote.textContent = '';
      this.rewardNote.classList.remove('reward-note--error');
    }
    this.showRoot();
    this.focusWhenShown(this.restartButton);
  }

  updateBalance(balance: number): void {
    this.finalBalance.textContent = formatScore(balance);
  }

  destroy(): void {
    this.restartButton.removeEventListener('click', this.handleRestart);
    this.shopButton.removeEventListener('click', this.handleShop);
    this.menuButton.removeEventListener('click', this.handleMenu);
  }

  private readonly handleRestart = (): void => {
    this.callbacks.onRestart();
  };

  private readonly handleShop = (): void => {
    this.callbacks.onShop();
  };

  private readonly handleMenu = (): void => {
    this.callbacks.onMenu();
  };
}
