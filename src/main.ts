import './styles/main.css';
import './styles/shop.css';
import type { Game as GameInstance } from './game/Game';

let game: GameInstance | null = null;
let booted = false;
let booting = true;

const appElement = document.getElementById('app');
const bootScreen = document.getElementById('boot-screen');
const progressBar = document.getElementById('boot-progress');
const progressFill = document.getElementById('boot-progress-fill');
const statusElement = document.getElementById('boot-status');
const detailElement = document.getElementById('boot-detail');
const errorElement = document.getElementById('boot-error');
const errorMessage = document.getElementById('boot-error-message');
const retryButton = document.getElementById('boot-retry');

// Keep the underlying UI inert (mouse, keyboard and assistive tech) until the
// warmup finishes. The overlay alone cannot stop Enter/Space from reaching the
// game's window-level shortcuts.
if (appElement instanceof HTMLElement) {
  appElement.inert = true;
}

const GAME_KEYS = new Set(['enter', ' ', 'escape', 'p']);

function blockGameKeysDuringBoot(event: KeyboardEvent): void {
  if (!booting || !GAME_KEYS.has(event.key.toLowerCase())) {
    return;
  }
  event.stopImmediatePropagation();
  event.preventDefault();
}

window.addEventListener('keydown', blockGameKeysDuringBoot, true);

function finishBootInput(): void {
  booting = false;
  window.removeEventListener('keydown', blockGameKeysDuringBoot, true);
}

function enableApp(): void {
  finishBootInput();
  if (appElement instanceof HTMLElement) {
    appElement.inert = false;
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function setProgress(percent: number, status?: string, detail?: string): void {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  if (progressFill instanceof HTMLElement) {
    progressFill.style.width = `${safePercent}%`;
  }
  if (progressBar instanceof HTMLElement) {
    progressBar.setAttribute('aria-valuenow', String(safePercent));
  }
  if (status && statusElement) {
    statusElement.textContent = status;
  }
  if (detail && detailElement) {
    detailElement.textContent = detail;
  }
}

function showBootError(error: unknown): void {
  console.error('Failed to start Fruit Slash 3D', error);
  finishBootInput();
  game?.dispose();
  game = null;
  bootScreen?.classList.remove('is-complete');
  bootScreen?.setAttribute('aria-busy', 'false');
  if (progressFill instanceof HTMLElement) {
    progressFill.style.width = '100%';
    progressFill.style.background = '#ff6b6b';
  }
  if (statusElement) {
    statusElement.textContent = 'Không thể khởi động game';
  }
  if (detailElement) {
    detailElement.hidden = true;
  }
  if (errorMessage) {
    errorMessage.textContent =
      'Trình duyệt có thể chưa bật WebGL hoặc đã chặn phần cứng đồ họa. Hãy thử tải lại trang, hoặc bật tăng tốc phần cứng trong cài đặt trình duyệt.';
  }
  if (errorElement) {
    errorElement.hidden = false;
  }
}

async function hideBootScreen(): Promise<void> {
  setProgress(100, 'Sẵn sàng!', 'Chúc bạn phá kỷ lục mới.');
  await nextFrame();
  bootScreen?.classList.add('is-complete');
  enableApp();
  window.setTimeout(() => {
    bootScreen?.remove();
  }, 400);
}

async function boot(): Promise<void> {
  if (booted) {
    return;
  }
  booted = true;

  try {
    setProgress(6, 'Đang tải game…', 'Kết nối tới engine 3D…');
    await nextFrame();

    const { Game } = await import('./game/Game');
    setProgress(20, 'Đang khởi tạo…', 'Tạo cảnh 3D, âm thanh và giao diện…');
    await nextFrame();

    const container = document.getElementById('game-container');
    if (!(container instanceof HTMLElement)) {
      throw new Error('Missing #game-container element.');
    }

    game = new Game(container);
    await game.preload((fraction, status, detail) => {
      setProgress(26 + fraction * 69, status, detail);
    });
    await nextFrame();
    await hideBootScreen();
  } catch (error) {
    showBootError(error);
  }
}

if (retryButton instanceof HTMLButtonElement) {
  retryButton.addEventListener('click', () => {
    window.location.reload();
  });
}

void boot();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game?.dispose();
    game = null;
  });
}
