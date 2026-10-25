export const GameState = {
  Ready: 'READY',
  Playing: 'PLAYING',
  Paused: 'PAUSED',
  Shop: 'SHOP',
  Settings: 'SETTINGS',
  GameOver: 'GAME_OVER',
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];
