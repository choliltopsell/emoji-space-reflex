export enum EntityType {
  ROCKET = 'ROCKET', // Basic +
  STAR = 'STAR',     // Basic +
  DIAMOND = 'DIAMOND', // Bonus ++
  BOMB = 'BOMB',     // Damage --
  DEVIL = 'DEVIL',   // Damage -
  CLOCK = 'CLOCK',   // Time +
  MYSTERY = 'MYSTERY' // Random
}

export interface GameEntity {
  id: string;
  type: EntityType;
  x: number; // Percent 0-100
  duration: number; // Animation duration in seconds
  createdAt: number;
  isPopped: boolean;
  direction: 'up' | 'down';
}

export interface FloatingText {
  id: string;
  x: number;
  y: number; // Pixels
  text: string;
  color: string;
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAMEOVER = 'GAMEOVER'
}

export interface DailyStats {
  date: string;
  highScore: number;
  gamesPlayed: number;
}

export type ActiveRule = {
  id: string;
  text: string;
  condition: (type: EntityType) => boolean; // Returns true if click is VALID
  duration: number; // How long the rule lasts
};