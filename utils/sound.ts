// Simple synthesizer to avoid external assets
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

type SoundType = 'pop' | 'bonus' | 'damage' | 'gameover' | 'tick';

export const playSound = (type: SoundType) => {
  initAudio();
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  switch (type) {
    case 'pop':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;

    case 'bonus':
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.linearRampToValueAtTime(1200, now + 0.1);
      oscillator.frequency.linearRampToValueAtTime(1800, now + 0.2);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;

    case 'damage':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, now);
      oscillator.frequency.linearRampToValueAtTime(50, now + 0.3);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;

    case 'gameover':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(300, now);
      oscillator.frequency.exponentialRampToValueAtTime(50, now + 1);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 1);
      oscillator.start(now);
      oscillator.stop(now + 1);
      break;
      
    case 'tick':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        break;
  }
};