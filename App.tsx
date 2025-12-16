import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEntity, EntityType, GameState, FloatingText, DailyStats, ActiveRule } from './types';
import { GAME_DURATION, SPAWN_RATE_INITIAL, SPAWN_RATE_MIN, SCORE_MAP, COLORS } from './constants';
import { playSound } from './utils/sound';
import { EntityComponent } from './components/EntityComponent';
import { Trophy, Timer, Zap, Play, RotateCcw, Volume2 } from 'lucide-react';

export default function App() {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [entities, setEntities] = useState<GameEntity[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [dailyStats, setDailyStats] = useState<DailyStats>({ date: '', highScore: 0, gamesPlayed: 0 });
  const [shake, setShake] = useState(false);
  const [activeRule, setActiveRule] = useState<ActiveRule | null>(null);

  // --- Refs for Loop ---
  const requestRef = useRef<number>();
  const lastSpawnTime = useRef<number>(0);
  const currentSpawnRate = useRef<number>(SPAWN_RATE_INITIAL);
  const scoreRef = useRef(0); // Ref for immediate access in loop
  
  // --- Persistence ---
  useEffect(() => {
    // Load High Score
    const saved = localStorage.getItem('esr_highscore');
    if (saved) setHighScore(parseInt(saved, 10));

    // Load Daily Stats
    const today = new Date().toISOString().split('T')[0];
    const savedDaily = localStorage.getItem('esr_daily');
    if (savedDaily) {
      const parsed: DailyStats = JSON.parse(savedDaily);
      if (parsed.date === today) {
        setDailyStats(parsed);
      } else {
        setDailyStats({ date: today, highScore: 0, gamesPlayed: 0 });
      }
    } else {
      setDailyStats({ date: today, highScore: 0, gamesPlayed: 0 });
    }
  }, []);

  const saveStats = (finalScore: number) => {
    // Global High Score
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('esr_highscore', finalScore.toString());
    }

    // Daily Stats
    const newStats = { ...dailyStats, gamesPlayed: dailyStats.gamesPlayed + 1 };
    if (finalScore > newStats.highScore) {
      newStats.highScore = finalScore;
    }
    setDailyStats(newStats);
    localStorage.setItem('esr_daily', JSON.stringify(newStats));
  };

  // --- Game Mechanics ---

  const spawnEntity = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const x = Math.floor(Math.random() * 80) + 10; // Keep within 10-90% width
    
    // Difficulty curve: More bad items as score increases
    const difficultyMultiplier = Math.min(scoreRef.current / 1000, 1);
    
    let type = EntityType.ROCKET;
    const roll = Math.random();

    if (roll < 0.05) type = EntityType.DIAMOND; // Rare bonus
    else if (roll < 0.08) type = EntityType.CLOCK; // Time bonus
    else if (roll < 0.10) type = EntityType.MYSTERY; // Mystery
    else if (roll < 0.3 + (difficultyMultiplier * 0.2)) type = EntityType.BOMB; // Bomb chance increases
    else if (roll < 0.5) type = EntityType.DEVIL;
    else if (roll < 0.75) type = EntityType.STAR;
    
    // Variation in speed
    const duration = Math.max(2, 4 - (difficultyMultiplier * 1.5)); 

    const newEntity: GameEntity = {
      id,
      type,
      x,
      duration: duration + (Math.random() * 1), // Add slight randomness
      createdAt: Date.now(),
      isPopped: false,
      direction: Math.random() > 0.5 ? 'up' : 'down'
    };

    setEntities(prev => [...prev, newEntity]);
  };

  const handleRuleChange = () => {
    // Logic to occasionally triggers a rule change
    const rules: ActiveRule[] = [
      { 
        id: 'no-star', 
        text: "DON'T CLICK STARS!", 
        duration: 5000, 
        condition: (t) => t !== EntityType.STAR 
      },
      { 
        id: 'only-rockets', 
        text: "ONLY CLICK ROCKETS!", 
        duration: 5000, 
        condition: (t) => t === EntityType.ROCKET 
      },
      { 
        id: 'safety', 
        text: "BOMBS ARE SAFE (3s)!", 
        duration: 3000, 
        condition: (t) => true // Everything is safe
      }
    ];

    const randomRule = rules[Math.floor(Math.random() * rules.length)];
    setActiveRule(randomRule);
    
    setTimeout(() => {
      setActiveRule(null);
    }, randomRule.duration);
  };

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setEntities([]);
    setFloatingTexts([]);
    setCombo(0);
    lastSpawnTime.current = 0;
    currentSpawnRate.current = SPAWN_RATE_INITIAL;
    setActiveRule(null);
    playSound('bonus');
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    const id = Date.now().toString() + Math.random();
    setFloatingTexts(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 800);
  };

  const handleInteract = (id: string, x: number, y: number, type: EntityType) => {
    if (gameState !== GameState.PLAYING) return;

    // Check Active Rule
    let isValid = true;
    if (activeRule) {
      isValid = activeRule.condition(type);
    } else {
      // Default Logic
      if (type === EntityType.BOMB || type === EntityType.DEVIL) isValid = false;
    }

    // Special override if Bomb is clicked correctly (e.g. during "Safety" rule), it gives points
    let points = SCORE_MAP[type];
    
    // Logic Execution
    if (!isValid) {
        // Bad Click
        playSound('damage');
        triggerShake();
        setCombo(0);
        setTimeLeft(prev => Math.max(0, prev - 5)); // Penalty time
        addFloatingText(x, y, "-5s", COLORS.NEGATIVE);
        
        // Remove entity visually
        setEntities(prev => prev.map(e => e.id === id ? { ...e, isPopped: true } : e));
        setTimeout(() => setEntities(prev => prev.filter(e => e.id !== id)), 300);
        return;
    }

    // Good Click
    playSound(type === EntityType.DIAMOND ? 'bonus' : 'pop');
    
    // Combo Multiplier
    const multiplier = Math.floor(combo / 10) + 1;
    let finalPoints = points * multiplier;

    // Special Items
    if (type === EntityType.CLOCK) {
      setTimeLeft(prev => prev + 5);
      addFloatingText(x, y, "+5s", COLORS.BONUS);
    } else if (type === EntityType.MYSTERY) {
       // Random effect
       if (Math.random() > 0.5) {
         finalPoints = 100;
         addFloatingText(x, y, "LUCKY!", COLORS.BONUS);
       } else {
         handleRuleChange();
         addFloatingText(x, y, "RULE CHANGE!", COLORS.NEGATIVE);
       }
    } else {
        addFloatingText(x, y, `+${finalPoints}`, type === EntityType.DIAMOND ? COLORS.BONUS : COLORS.POSITIVE);
    }

    setScore(prev => {
        const newScore = prev + finalPoints;
        scoreRef.current = newScore;
        return newScore;
    });
    setCombo(prev => prev + 1);

    // Remove entity
    setEntities(prev => prev.map(e => e.id === id ? { ...e, isPopped: true } : e));
    setTimeout(() => setEntities(prev => prev.filter(e => e.id !== id)), 300);
  };

  // --- Game Loop ---
  const gameLoop = useCallback((time: number) => {
    if (gameState !== GameState.PLAYING) return;

    // 1. Spawning
    if (time - lastSpawnTime.current > currentSpawnRate.current) {
      spawnEntity();
      lastSpawnTime.current = time;
      
      // Increase speed based on score
      const newRate = Math.max(SPAWN_RATE_MIN, SPAWN_RATE_INITIAL - (scoreRef.current * 0.5));
      currentSpawnRate.current = newRate;
    }

    // 2. Cleanup (remove entities that floated off screen)
    // In a real physics engine we'd check position, but here we rely on CSS animation duration.
    // We'll run a cleanup every second effectively via the main React render cycle logic roughly
    // Or just let them naturally unmount via `setTimeout` in their creation? 
    // Better: Filter based on creation time vs duration.
    const now = Date.now();
    setEntities(prev => prev.filter(e => {
        const age = (now - e.createdAt) / 1000;
        return age < (e.duration + 0.5); // +0.5 buffer
    }));

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameState]); // Dependencies minimized

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, gameLoop]);

  // Timer Countdown
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          playSound('gameover');
          setGameState(GameState.GAMEOVER);
          saveStats(scoreRef.current);
          return 0;
        }
        if (prev <= 5) playSound('tick');
        return prev - 1;
      });
      
      // Random Rule Trigger chance every second if none active
      if (!activeRule && Math.random() < 0.1 && scoreRef.current > 200) {
        handleRuleChange();
      }

    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, activeRule]);

  // --- Render ---

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-slate-900 text-white ${shake ? 'shake-screen' : ''}`}>
      
      {/* Background Grid/Stars Effect */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900 pointer-events-none" />

      {/* Floating Score Texts */}
      {floatingTexts.map(ft => (
        <div 
          key={ft.id}
          className={`absolute font-bold text-2xl z-50 pointer-events-none animate-float-text ${ft.color}`}
          style={{ left: ft.x, top: ft.y }}
        >
          {ft.text}
        </div>
      ))}

      {/* Game Layer */}
      <div className="relative w-full h-full z-10">
        {entities.map(entity => (
          <EntityComponent key={entity.id} entity={entity} onInteract={handleInteract} />
        ))}
      </div>

      {/* Active Rule Warning */}
      {activeRule && gameState === GameState.PLAYING && (
        <div className="absolute top-1/3 left-0 w-full text-center z-40 pointer-events-none">
          <div className="inline-block bg-red-600/90 text-white px-6 py-3 rounded-lg text-2xl font-black animate-pulse shadow-lg border-2 border-yellow-400 transform -rotate-2">
            ⚠️ {activeRule.text}
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-4 z-50 flex flex-col gap-2 pointer-events-none">
        
        {/* Top Bar */}
        <div className="flex justify-between items-start">
            <div className="flex flex-col">
                <div className="text-4xl font-black italic tracking-tighter text-neon">
                    {score.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 font-mono">SCORE</div>
            </div>

            <div className={`flex flex-col items-end ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                <div className="text-4xl font-black font-mono">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                 <div className="text-xs text-slate-400 font-mono">TIME</div>
            </div>
        </div>

        {/* Combo Bar */}
        {combo > 1 && (
            <div className="self-center">
                 <div className="text-yellow-400 font-bold text-xl animate-bounce">
                    {combo}x COMBO!
                 </div>
                 <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                     <div className="h-full bg-yellow-400" style={{ width: `${Math.min(combo * 5, 100)}%` }} />
                 </div>
            </div>
        )}
      </div>

      {/* Menus */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-slate-800/90 p-8 rounded-2xl border border-purple-500/50 shadow-2xl max-w-md w-full text-center">
             <div className="mb-6">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
                    EMOJI SPACE
                </h1>
                <h2 className="text-2xl font-light tracking-widest text-cyan-300">REFLEX</h2>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-900/50 p-4 rounded-xl">
                 <div className="flex flex-col items-center">
                     <Trophy className="w-6 h-6 text-yellow-400 mb-1" />
                     <span className="text-sm text-slate-400">High Score</span>
                     <span className="font-bold text-xl">{highScore}</span>
                 </div>
                 <div className="flex flex-col items-center">
                     <Zap className="w-6 h-6 text-purple-400 mb-1" />
                     <span className="text-sm text-slate-400">Daily Best</span>
                     <span className="font-bold text-xl">{dailyStats.highScore}</span>
                 </div>
             </div>
             
             <div className="text-left text-sm text-slate-300 mb-8 space-y-2 bg-slate-900 p-4 rounded-lg">
                <p>🚀 <span className="text-green-400">Click</span> to score points.</p>
                <p>💣 <span className="text-red-400">Avoid</span> bombs & devils.</p>
                <p>💎 Diamonds give <span className="text-cyan-400">Bonus</span>!</p>
                <p>⚠️ Watch for <span className="text-yellow-400">Rule Changes</span>.</p>
             </div>

             <button 
                onClick={startGame}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-xl text-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
             >
                <Play className="fill-current" /> PLAY NOW
             </button>
          </div>
        </div>
      )}

      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
           <div className="text-center">
              <h2 className="text-6xl font-black text-white mb-2 animate-bounce">GAME OVER</h2>
              <div className="text-2xl text-slate-300 mb-8">Time's Up!</div>

              <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 mb-8 inline-block min-w-[300px]">
                  <div className="text-sm text-slate-400 uppercase tracking-wide">Final Score</div>
                  <div className="text-6xl font-black text-neon-blue my-2">{score}</div>
                  {score >= highScore && score > 0 && (
                      <div className="text-yellow-400 font-bold animate-pulse">🏆 NEW HIGH SCORE!</div>
                  )}
              </div>

              <div className="flex justify-center gap-4">
                  <button 
                    onClick={startGame}
                    className="bg-white text-slate-900 hover:bg-slate-200 font-bold py-3 px-8 rounded-full text-lg shadow-xl flex items-center gap-2 transition transform hover:scale-105"
                  >
                    <RotateCcw size={20} /> TRY AGAIN
                  </button>
                  <button 
                    onClick={() => setGameState(GameState.MENU)}
                    className="bg-slate-700 text-white hover:bg-slate-600 font-bold py-3 px-6 rounded-full text-lg shadow-xl transition"
                  >
                    MENU
                  </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}