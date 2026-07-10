// Web Audio API Synthesizer for high-fidelity retro-futuristic sound effects

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playHoverSound(volume: number = 0.5) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    // Frequency sweep up
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(volume * 0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    // Ignore context blocked errors
  }
}

export function playClickSound(volume: number = 0.5) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.04);

    gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore
  }
}

export function playChimeSound(volume: number = 0.5) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Play two notes in harmony
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume * 0.1, now + idx * 0.06 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  } catch (e) {
    // Ignore
  }
}

// Background drone manager
let ambientOsc1: OscillatorNode | null = null;
let ambientOsc2: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;

export function startAmbientDrone(volume: number = 0.5) {
  try {
    const ctx = getAudioContext();
    if (ambientOsc1) return; // Already running

    ambientGain = ctx.createGain();
    ambientGain.gain.setValueAtTime(0, ctx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(volume * 0.12, ctx.currentTime + 2.0); // Fade in over 2s

    // Low rumble oscillator
    ambientOsc1 = ctx.createOscillator();
    ambientOsc1.type = 'sine';
    ambientOsc1.frequency.setValueAtTime(65, ctx.currentTime); // Low C

    // Detuned second oscillator for beating/chorus effect
    ambientOsc2 = ctx.createOscillator();
    ambientOsc2.type = 'triangle';
    ambientOsc2.frequency.setValueAtTime(65.4, ctx.currentTime); 

    // Filter to make it warmer
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, ctx.currentTime);

    ambientOsc1.connect(filter);
    ambientOsc2.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(ctx.destination);

    ambientOsc1.start();
    ambientOsc2.start();
  } catch (e) {
    // Ignore
  }
}

export function stopAmbientDrone() {
  try {
    if (ambientGain && audioCtx) {
      ambientGain.gain.cancelScheduledValues(audioCtx.currentTime);
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, audioCtx.currentTime);
      ambientGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      setTimeout(() => {
        if (ambientOsc1) {
          ambientOsc1.stop();
          ambientOsc1.disconnect();
          ambientOsc1 = null;
        }
        if (ambientOsc2) {
          ambientOsc2.stop();
          ambientOsc2.disconnect();
          ambientOsc2 = null;
        }
        if (ambientGain) {
          ambientGain.disconnect();
          ambientGain = null;
        }
      }, 600);
    }
  } catch (e) {
    // Ignore
  }
}

export function updateAmbientVolume(volume: number) {
  try {
    if (ambientGain && audioCtx) {
      ambientGain.gain.linearRampToValueAtTime(volume * 0.12, audioCtx.currentTime + 0.1);
    }
  } catch (e) {
    // Ignore
  }
}
