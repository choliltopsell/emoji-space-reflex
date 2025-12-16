import React from 'react';
import { GameEntity, EntityType } from '../types';
import { EMOJI_MAP } from '../constants';

interface EntityProps {
  entity: GameEntity;
  onInteract: (id: string, x: number, y: number, type: EntityType) => void;
}

export const EntityComponent: React.FC<EntityProps> = ({ entity, onInteract }) => {
  const isBomb = entity.type === EntityType.BOMB;
  const isBonus = entity.type === EntityType.DIAMOND;
  
  // Animation duration style
  const style: React.CSSProperties = {
    left: `${entity.x}%`,
    animationDuration: `${entity.duration}s`,
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); // Prevent ghost clicks
    if (entity.isPopped) return;
    onInteract(entity.id, e.clientX, e.clientY, entity.type);
  };

  if (entity.isPopped) {
    return (
      <div
        className="absolute text-5xl pointer-events-none animate-pop z-10"
        style={{ left: `${entity.x}%`, top: entity.direction === 'up' ? '10%' : '90%' }} 
        /* Just a visual anchor, position isn't perfect for pop but good enough */
      >
        💥
      </div>
    );
  }

  return (
    <div
      className={`absolute cursor-pointer select-none text-5xl transform hover:scale-110 transition-transform active:scale-95 z-10
        ${entity.direction === 'up' ? 'animate-float-up bottom-[-10vh]' : 'animate-float-down top-[-10vh]'}
        ${isBomb ? 'drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]' : ''}
        ${isBonus ? 'drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]' : 'drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]'}
      `}
      style={style}
      onPointerDown={handlePointerDown}
    >
      {EMOJI_MAP[entity.type]}
    </div>
  );
};