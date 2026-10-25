import { GAME_CONFIG } from '../config/gameConfig';

export function requireElement<T extends Element>(
  parent: ParentNode,
  selector: string,
): T {
  const element = parent.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

export function requireId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing required element #${id}`);
  }
  return element as T;
}

export function formatScore(score: number): string {
  return Math.max(0, Math.floor(score)).toLocaleString('vi-VN');
}

export function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const MAX_LIVES = GAME_CONFIG.startingLives;
