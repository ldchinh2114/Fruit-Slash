import { CurrencyDisplay } from './CurrencyDisplay';
import { formatScore, requireId } from './dom';
import { Screen } from './Screen';

export interface StartScreenCallbacks {
  onStart(): void;
  onShop(): void;
  onSettings(): void;
}

export class StartScreen extends Screen {
  private readonly startButton = requireId<HTMLButtonElement>('btn-start');
  private readonly shopButton =
    requireId<HTMLButtonElement>('btn-start-shop');
  private readonly settingsButton =
    requireId<HTMLButtonElement>('btn-start-settings');
  private readonly bestValue = requireId('start-best-value');
  private readonly coinDisplay = new CurrencyDisplay(requireId('start-coins'));

  constructor(private readonly callbacks: StartScreenCallbacks) {
    super('screen-start');
    this.startButton.addEventListener('click', this.handleStart);
    this.shopButton.addEventListener('click', this.handleShop);
    this.settingsButton.addEventListener('click', this.handleSettings);
  }

  show(bestScore: number, coins: number): void {
    this.bestValue.textContent = formatScore(bestScore);
    this.coinDisplay.set(coins);
    this.showRoot();
  }

  destroy(): void {
    this.startButton.removeEventListener('click', this.handleStart);
    this.shopButton.removeEventListener('click', this.handleShop);
    this.settingsButton.removeEventListener('click', this.handleSettings);
    this.coinDisplay.destroy();
  }

  private readonly handleStart = (): void => {
    this.callbacks.onStart();
  };

  private readonly handleShop = (): void => {
    this.callbacks.onShop();
  };

  private readonly handleSettings = (): void => {
    this.callbacks.onSettings();
  };
}
