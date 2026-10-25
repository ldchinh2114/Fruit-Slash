import { requireId } from './dom';
import { Screen } from './Screen';

export interface PauseScreenCallbacks {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export class PauseScreen extends Screen {
  private readonly resumeButton = requireId<HTMLButtonElement>('btn-resume');
  private readonly restartButton = requireId<HTMLButtonElement>('btn-pause-restart');
  private readonly menuButton = requireId<HTMLButtonElement>('btn-pause-menu');

  constructor(private readonly callbacks: PauseScreenCallbacks) {
    super('screen-pause');
    this.resumeButton.addEventListener('click', this.handleResume);
    this.restartButton.addEventListener('click', this.handleRestart);
    this.menuButton.addEventListener('click', this.handleMenu);
  }

  show(): void {
    this.showRoot();
    this.focusWhenShown(this.resumeButton);
  }

  destroy(): void {
    this.resumeButton.removeEventListener('click', this.handleResume);
    this.restartButton.removeEventListener('click', this.handleRestart);
    this.menuButton.removeEventListener('click', this.handleMenu);
  }

  private readonly handleResume = (): void => {
    this.callbacks.onResume();
  };

  private readonly handleRestart = (): void => {
    this.callbacks.onRestart();
  };

  private readonly handleMenu = (): void => {
    this.callbacks.onMenu();
  };
}
