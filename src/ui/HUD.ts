import { EVENT_SYSTEM_CONFIG } from '../config/eventConfig';
import {
  type ActiveEventInfo,
  type EventCategory,
  type EventPresentation,
  type GameEventDefinition,
} from '../events/EventTypes';
import { MAX_LIVES, formatScore, formatTime, requireId } from './dom';

export interface HudCallbacks {
  onPause: () => void;
  onToggleSound: () => void;
}

interface EventNoticeView {
  readonly definitionId: string;
  readonly element: HTMLElement;
  readonly timer: HTMLElement | null;
  readonly bar: HTMLElement | null;
  dismissTimer: number;
  leaveTimer: number;
}

const MAX_NOTICES = 2;

const HEART_SVG = `
  <svg viewBox="0 0 32 29" aria-hidden="true" focusable="false">
    <path d="M16 28.1c-.6 0-1.2-.2-1.7-.6C8.6 22.9 1 17.1 1 9.6 1 4.8 4.4 1.3 8.9 1.3c2.7 0 5 1.3 7.1 4 2.1-2.7 4.4-4 7.1-4C27.6 1.3 31 4.8 31 9.6c0 7.5-7.6 13.3-13.3 17.9-.5.4-1.1.6-1.7.6z" />
  </svg>
`;

const CATEGORY_LABELS: Record<EventCategory, string> = {
  combo: 'Combo',
  score: 'Điểm số',
  random: 'Ngẫu nhiên',
  achievement: 'Thành tích',
  survival: 'Sinh tồn',
};

const RARITY_FALLBACK_COLORS: Record<
  GameEventDefinition['rarity'],
  string
> = {
  common: '#7ee8fa',
  uncommon: '#7ef0a5',
  rare: '#9d8cff',
  epic: '#ff9f43',
  legendary: '#ffd166',
};

function resolveEventColor(definition: GameEventDefinition): string {
  const color = definition.visual?.color;
  if (typeof color === 'number') {
    return `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
  }
  return RARITY_FALLBACK_COLORS[definition.rarity];
}

function getComboTier(combo: number): number {
  if (combo >= 30) {
    return 5;
  }
  if (combo >= 20) {
    return 4;
  }
  if (combo >= 10) {
    return 3;
  }
  if (combo >= 5) {
    return 2;
  }
  return 1;
}

export class HUD {
  private readonly root = requireId('hud');
  private readonly scoreElement = requireId('hud-score');
  private readonly timeElement = requireId('hud-time');
  private readonly levelElement = requireId('hud-level');
  private readonly livesElement = requireId('hud-lives');
  private readonly pauseButton = requireId<HTMLButtonElement>('hud-pause');
  private readonly soundButton = requireId<HTMLButtonElement>('hud-sound');
  private readonly toastElement = requireId('hud-toast');
  private readonly damageFlash = requireId('damage-flash');
  private readonly eventFeed = requireId('hud-event-feed');
  private readonly eventActive = requireId('hud-event-active');
  private readonly comboElement = requireId('hud-combo');
  private readonly comboValue = requireId('hud-combo-value');
  private readonly comboBar = requireId('hud-combo-bar');
  private readonly hearts: HTMLSpanElement[] = [];
  private readonly notices: EventNoticeView[] = [];
  private readonly prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly compactLayout = window.matchMedia('(max-width: 720px)');

  private displayedScore = -1;
  private displayedLives = -1;
  private displayedSeconds = -1;
  private displayedLevel = -1;
  private displayedCombo = -1;
  private comboVisible = false;
  private soundEnabled = true;
  private toastTimer = 0;
  private activeSignature = '';

  constructor(private readonly callbacks: HudCallbacks) {
    for (let index = 0; index < MAX_LIVES; index += 1) {
      const heart = document.createElement('span');
      heart.className = 'life';
      heart.innerHTML = HEART_SVG;
      this.hearts.push(heart);
      this.livesElement.appendChild(heart);
    }
    this.pauseButton.addEventListener('click', this.handlePauseClick);
    this.soundButton.addEventListener('click', this.handleSoundClick);
    this.damageFlash.addEventListener('animationend', this.handleFlashEnd);
    this.setLives(MAX_LIVES);
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
    if (!visible) {
      window.clearTimeout(this.toastTimer);
      this.toastElement.classList.remove('is-visible');
      this.clearEventUI();
      this.setCombo(0, 0);
    }
  }

  setScore(score: number): void {
    const safeScore = Math.max(0, Math.floor(score));
    if (safeScore === this.displayedScore) {
      return;
    }
    const increased = safeScore > this.displayedScore && this.displayedScore >= 0;
    this.displayedScore = safeScore;
    this.scoreElement.textContent = formatScore(safeScore);
    if (increased && !this.prefersReducedMotion) {
      this.scoreElement.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.12)' },
          { transform: 'scale(1)' },
        ],
        { duration: 190, easing: 'ease-out' },
      );
    }
  }

  setLives(lives: number): void {
    const safeLives = Math.max(0, Math.min(MAX_LIVES, Math.floor(lives)));
    if (safeLives === this.displayedLives) {
      return;
    }
    this.displayedLives = safeLives;
    this.hearts.forEach((heart, index) => {
      heart.classList.toggle('is-empty', index >= safeLives);
    });
    this.livesElement.setAttribute(
      'aria-label',
      `${safeLives} trên ${MAX_LIVES} trái tim`,
    );
  }

  setTime(seconds: number): void {
    const wholeSeconds = Math.max(0, Math.floor(seconds));
    if (wholeSeconds === this.displayedSeconds) {
      return;
    }
    this.displayedSeconds = wholeSeconds;
    this.timeElement.textContent = formatTime(wholeSeconds);
  }

  setLevel(level: number): void {
    const safeLevel = Math.max(1, Math.floor(level));
    if (safeLevel === this.displayedLevel) {
      return;
    }
    this.displayedLevel = safeLevel;
    this.levelElement.textContent = `Cấp ${safeLevel}`;
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.soundButton.classList.toggle('is-muted', !enabled);
    this.soundButton.setAttribute('aria-pressed', String(enabled));
    this.soundButton.setAttribute(
      'aria-label',
      enabled ? 'Tắt âm thanh' : 'Bật âm thanh',
    );
    this.soundButton.title = enabled ? 'Tắt âm thanh' : 'Bật âm thanh';
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  setPaused(paused: boolean): void {
    this.pauseButton.disabled = paused;
  }

  showToast(message: string): void {
    window.clearTimeout(this.toastTimer);
    this.toastElement.textContent = message;
    this.toastElement.classList.remove('is-visible');
    void this.toastElement.offsetWidth;
    this.toastElement.classList.add('is-visible');
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.classList.remove('is-visible');
    }, 2400);
  }

  showEvent(
    definition: GameEventDefinition,
    presentation: EventPresentation,
  ): void {
    const duplicate = this.notices.find((notice) => {
      return notice.definitionId === definition.id;
    });
    if (duplicate) {
      this.removeNotice(duplicate, false);
    }
    const maxNotices = this.compactLayout.matches ? 1 : MAX_NOTICES;
    while (this.notices.length >= maxNotices) {
      const oldest = this.notices[0];
      if (!oldest) {
        break;
      }
      this.removeNotice(oldest, false);
    }

    const notice = document.createElement('article');
    notice.className = 'event-notice';
    notice.style.setProperty('--event-color', resolveEventColor(definition));

    const head = document.createElement('div');
    head.className = 'event-notice__top';

    const category = document.createElement('span');
    category.className = 'event-notice__category';
    category.textContent = CATEGORY_LABELS[definition.category];
    head.append(category);

    let timer: HTMLSpanElement | null = null;
    if (definition.duration && definition.duration > 0) {
      timer = document.createElement('span');
      timer.className = 'event-notice__timer';
      timer.textContent = `${Math.ceil(definition.duration)}s`;
      head.append(timer);
    }

    const name = document.createElement('strong');
    name.className = 'event-notice__name';
    name.textContent = definition.name;

    const description = document.createElement('p');
    description.className = 'event-notice__desc';
    description.textContent = definition.description;

    notice.append(head, name, description);

    if (presentation.rewardText.length > 0) {
      const reward = document.createElement('span');
      reward.className = 'event-notice__reward';
      reward.textContent = presentation.rewardText;
      notice.append(reward);
    }

    let bar: HTMLSpanElement | null = null;
    if (timer) {
      bar = document.createElement('span');
      bar.className = 'event-notice__bar';
      notice.append(bar);
    }

    this.eventFeed.append(notice);

    const view: EventNoticeView = {
      definitionId: definition.id,
      element: notice,
      timer,
      bar,
      dismissTimer: 0,
      leaveTimer: 0,
    };
    view.dismissTimer = window.setTimeout(() => {
      this.removeNotice(view, true);
    }, EVENT_SYSTEM_CONFIG.banner.visibleSeconds * 1000);
    this.notices.push(view);
  }

  updateActiveEvents(active: readonly ActiveEventInfo[]): void {
    const activeById = new Map<string, ActiveEventInfo>();
    for (const event of active) {
      activeById.set(event.definition.id, event);
    }
    for (const notice of this.notices) {
      const current = activeById.get(notice.definitionId);
      if (!current || !notice.timer || !notice.bar) {
        continue;
      }
      const secondsLabel = `${Math.max(1, Math.ceil(current.remainingSeconds))}s`;
      if (notice.timer.textContent !== secondsLabel) {
        notice.timer.textContent = secondsLabel;
      }
      const progress =
        current.durationSeconds <= 0
          ? 0
          : Math.max(
              0,
              Math.min(1, current.remainingSeconds / current.durationSeconds),
            );
      notice.bar.style.transform = `scaleX(${progress.toFixed(3)})`;
    }

    const signature = active
      .map((event) => {
        return `${event.definition.id}:${Math.ceil(event.remainingSeconds)}`;
      })
      .join('|');
    if (signature !== this.activeSignature) {
      this.activeSignature = signature;
      this.renderActiveEvents(active);
    }
  }

  setCombo(combo: number, remainingFraction: number): void {
    const safeCombo = Math.max(0, Math.floor(combo));
    const fraction = Number.isFinite(remainingFraction)
      ? Math.max(0, Math.min(1, remainingFraction))
      : 0;
    const visible = safeCombo >= 2 && fraction > 0;

    if (!visible) {
      if (this.comboVisible) {
        this.comboVisible = false;
        this.comboElement.classList.remove('is-visible');
      }
      this.displayedCombo = 0;
      return;
    }

    if (!this.comboVisible) {
      this.comboVisible = true;
      this.comboElement.classList.add('is-visible');
    }

    if (safeCombo !== this.displayedCombo) {
      const increased = safeCombo > this.displayedCombo && this.displayedCombo > 0;
      this.displayedCombo = safeCombo;
      this.comboValue.textContent = String(safeCombo);
      this.comboElement.dataset.tier = String(getComboTier(safeCombo));
      if (increased && !this.prefersReducedMotion) {
        this.comboValue.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.22)' },
            { transform: 'scale(1)' },
          ],
          { duration: 170, easing: 'ease-out' },
        );
      }
    }

    this.comboBar.style.transform = `scaleX(${fraction.toFixed(3)})`;
  }

  clearEventUI(): void {
    for (const notice of this.notices) {
      window.clearTimeout(notice.dismissTimer);
      window.clearTimeout(notice.leaveTimer);
    }
    this.notices.length = 0;
    this.eventFeed.replaceChildren();
    this.activeSignature = '';
    this.eventActive.replaceChildren();
    this.eventActive.hidden = true;
  }

  flashDamage(): void {
    this.damageFlash.classList.remove('is-active');
    void this.damageFlash.offsetWidth;
    this.damageFlash.classList.add('is-active');
  }

  destroy(): void {
    this.pauseButton.removeEventListener('click', this.handlePauseClick);
    this.soundButton.removeEventListener('click', this.handleSoundClick);
    this.damageFlash.removeEventListener('animationend', this.handleFlashEnd);
    window.clearTimeout(this.toastTimer);
    this.clearEventUI();
  }

  private removeNotice(notice: EventNoticeView, animate: boolean): void {
    const index = this.notices.indexOf(notice);
    if (index >= 0) {
      this.notices.splice(index, 1);
    }
    window.clearTimeout(notice.dismissTimer);
    window.clearTimeout(notice.leaveTimer);
    if (!animate || this.prefersReducedMotion) {
      notice.element.remove();
      return;
    }
    notice.element.classList.add('is-leaving');
    notice.leaveTimer = window.setTimeout(() => {
      notice.element.remove();
    }, 220);
  }

  private renderActiveEvents(active: readonly ActiveEventInfo[]): void {
    this.eventActive.replaceChildren();
    if (active.length === 0) {
      this.eventActive.hidden = true;
      return;
    }
    this.eventActive.hidden = false;
    for (const event of active) {
      const chip = document.createElement('span');
      chip.className = 'event-chip';
      chip.style.setProperty(
        '--event-color',
        resolveEventColor(event.definition),
      );

      const name = document.createElement('span');
      name.className = 'event-chip__name';
      name.textContent = event.definition.name;

      const time = document.createElement('span');
      time.className = 'event-chip__time';
      time.textContent = `${Math.max(1, Math.ceil(event.remainingSeconds))}s`;

      const bar = document.createElement('span');
      bar.className = 'event-chip__bar';
      const progress = Math.max(
        0,
        Math.min(
          1,
          event.durationSeconds <= 0
            ? 0
            : event.remainingSeconds / event.durationSeconds,
        ),
      );
      bar.style.width = `${Math.round(progress * 100)}%`;

      chip.append(name, time, bar);
      this.eventActive.appendChild(chip);
    }
  }

  private readonly handlePauseClick = (): void => {
    this.callbacks.onPause();
  };

  private readonly handleSoundClick = (): void => {
    this.callbacks.onToggleSound();
  };

  private readonly handleFlashEnd = (): void => {
    this.damageFlash.classList.remove('is-active');
  };
}
