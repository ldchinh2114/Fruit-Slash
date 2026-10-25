import type {
  PlayerSettings,
  PlayerStatistics,
} from '../persistence/SaveSchema';
import { formatScore, requireId } from './dom';
import { Screen } from './Screen';

export interface ResetOutcome {
  ok: boolean;
  settings: PlayerSettings;
  statistics: PlayerStatistics;
}

export interface SettingsCallbacks {
  onClose(): void;
  onSoundChange(enabled: boolean): boolean;
  onVolumeChange(volume: number, commit: boolean): number;
  onResetData(): ResetOutcome;
}

export class SettingsScreen extends Screen {
  private readonly closeButton =
    requireId<HTMLButtonElement>('btn-settings-close');
  private readonly soundCheckbox =
    requireId<HTMLInputElement>('settings-sound');
  private readonly volumeInput =
    requireId<HTMLInputElement>('settings-volume');
  private readonly volumeValue = requireId('settings-volume-value');
  private readonly resetButton = requireId<HTMLButtonElement>('btn-reset-data');
  private readonly resetConfirm = requireId('settings-reset-confirm');
  private readonly resetConfirmButton =
    requireId<HTMLButtonElement>('btn-reset-confirm');
  private readonly resetCancelButton =
    requireId<HTMLButtonElement>('btn-reset-cancel');
  private readonly message = requireId('settings-message');

  constructor(private readonly callbacks: SettingsCallbacks) {
    super('screen-settings');
    this.closeButton.addEventListener('click', this.handleClose);
    this.soundCheckbox.addEventListener('change', this.handleSoundChange);
    this.volumeInput.addEventListener('input', this.handleVolumeInput);
    this.volumeInput.addEventListener('change', this.handleVolumeCommit);
    this.resetButton.addEventListener('click', this.handleResetRequest);
    this.resetConfirmButton.addEventListener('click', this.handleResetConfirm);
    this.resetCancelButton.addEventListener('click', this.handleResetCancel);
  }

  show(settings: PlayerSettings, statistics: PlayerStatistics): void {
    this.soundCheckbox.checked = settings.soundEnabled;
    this.volumeInput.value = String(Math.round(settings.volume * 100));
    this.updateVolumeLabel(settings.volume);
    this.updateStatistics(statistics);
    this.resetConfirm.hidden = true;
    this.clearMessage();
    this.showRoot();
    this.focusWhenShown(this.closeButton);
  }

  destroy(): void {
    this.closeButton.removeEventListener('click', this.handleClose);
    this.soundCheckbox.removeEventListener('change', this.handleSoundChange);
    this.volumeInput.removeEventListener('input', this.handleVolumeInput);
    this.volumeInput.removeEventListener('change', this.handleVolumeCommit);
    this.resetButton.removeEventListener('click', this.handleResetRequest);
    this.resetConfirmButton.removeEventListener(
      'click',
      this.handleResetConfirm,
    );
    this.resetCancelButton.removeEventListener('click', this.handleResetCancel);
  }

  private updateStatistics(statistics: PlayerStatistics): void {
    requireId('settings-stat-games').textContent = statistics.totalGames.toLocaleString(
      'vi-VN',
    );
    requireId('settings-stat-best').textContent = formatScore(
      statistics.bestScore,
    );
    requireId('settings-stat-earned').textContent = formatScore(
      statistics.totalCoinsEarned,
    );
    requireId('settings-stat-spent').textContent = formatScore(
      statistics.totalCoinsSpent,
    );
    requireId('settings-stat-fruits').textContent = formatScore(
      statistics.totalFruits,
    );
    requireId('settings-stat-bombs').textContent = formatScore(
      statistics.totalBombs,
    );
  }

  private updateVolumeLabel(volume: number): void {
    this.volumeValue.textContent = `${Math.round(volume * 100)}%`;
  }

  private showMessage(text: string, tone: 'success' | 'error'): void {
    this.message.textContent = text;
    this.message.className = `settings-message is-visible settings-message--${tone}`;
  }

  private clearMessage(): void {
    this.message.textContent = '';
    this.message.className = 'settings-message';
  }

  private readonly handleClose = (): void => {
    this.callbacks.onClose();
  };

  private readonly handleSoundChange = (): void => {
    const enabled = this.soundCheckbox.checked;
    if (!this.callbacks.onSoundChange(enabled)) {
      this.soundCheckbox.checked = !enabled;
      this.showMessage('Không thể lưu cài đặt âm thanh.', 'error');
      return;
    }
    this.clearMessage();
  };

  private readonly handleVolumeInput = (): void => {
    const requested = Number(this.volumeInput.value) / 100;
    const applied = this.callbacks.onVolumeChange(requested, false);
    this.volumeInput.value = String(Math.round(applied * 100));
    this.updateVolumeLabel(applied);
  };

  private readonly handleVolumeCommit = (): void => {
    const requested = Number(this.volumeInput.value) / 100;
    const applied = this.callbacks.onVolumeChange(requested, true);
    this.volumeInput.value = String(Math.round(applied * 100));
    this.updateVolumeLabel(applied);
    if (applied !== requested) {
      this.showMessage('Không thể lưu âm lượng.', 'error');
    } else {
      this.clearMessage();
    }
  };

  private readonly handleResetRequest = (): void => {
    this.clearMessage();
    this.resetConfirm.hidden = false;
    this.resetConfirmButton.focus({ preventScroll: true });
  };

  private readonly handleResetCancel = (): void => {
    this.resetConfirm.hidden = true;
    this.resetButton.focus({ preventScroll: true });
  };

  private readonly handleResetConfirm = (): void => {
    const outcome = this.callbacks.onResetData();
    this.resetConfirm.hidden = true;
    if (!outcome.ok) {
      this.showMessage(
        'Không thể lưu dữ liệu mặc định. Vui lòng thử lại.',
        'error',
      );
      return;
    }
    this.soundCheckbox.checked = outcome.settings.soundEnabled;
    this.volumeInput.value = String(
      Math.round(outcome.settings.volume * 100),
    );
    this.updateVolumeLabel(outcome.settings.volume);
    this.updateStatistics(outcome.statistics);
    this.showMessage(
      'Đã đặt lại toàn bộ dữ liệu về trạng thái ban đầu.',
      'success',
    );
  };
}
