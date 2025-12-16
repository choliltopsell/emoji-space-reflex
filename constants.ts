import { EntityType } from './types';

export const GAME_DURATION = 60; // Seconds
export const SPAWN_RATE_INITIAL = 800; // ms
export const SPAWN_RATE_MIN = 300; // ms

export const EMOJI_MAP: Record<EntityType, string> = {
  [EntityType.ROCKET]: '🚀',
  [EntityType.STAR]: '⭐',
  [EntityType.DIAMOND]: '💎',
  [EntityType.BOMB]: '💣',
  [EntityType.DEVIL]: '😈',
  [EntityType.CLOCK]: '⏱️',
  [EntityType.MYSTERY]: '❓',
};

export const SCORE_MAP: Record<EntityType, number> = {
  [EntityType.ROCKET]: 10,
  [EntityType.STAR]: 10,
  [EntityType.DIAMOND]: 50,
  [EntityType.BOMB]: -50,
  [EntityType.DEVIL]: -20,
  [EntityType.CLOCK]: 0, // Special handling
  [EntityType.MYSTERY]: 0, // Special handling
};

export const COLORS = {
  POSITIVE: 'text-green-400',
  NEGATIVE: 'text-red-500',
  BONUS: 'text-cyan-400',
  NEUTRAL: 'text-white'
};