import { useState, useRef } from 'react';
import { Volume2 } from 'lucide-react';

const drums = [
  { id: 'Q', name: 'Kick', freq: 150, type: 'sine' as OscillatorType },
  { id: 'W', name: 'Snare', freq: 300, type: 'triangle' as OscillatorType },
  { id: 'E', name: 'Hi-Hat', freq: 800, type: 'square' as OscillatorType },
  { id: 'A', name: 'Tom', freq: 200, type: 'sine' as OscillatorType },
  { id: 'S', name: 'Clap', freq: 400, type: 'triangle' as OscillatorType },
  { id: 'D', name: 'Crash', freq: 1200, type: 'square' as OscillatorType },
  { id: 'Z', name: 'Bass', freq: 100, type: 'sine' as OscillatorType },
  { id: 'X', name: 'Synth', freq: 600, type: 'sawtooth' as OscillatorType },
  { id: 'C', name: 'Bell', freq: 1000, type: 'sine' as OscillatorType },
];

export default function DrumMachine() {
  const [active, setActive] = useState<string | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  const play = (drum: typeof drums[0]) => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = drum.type;
    osc.frequency.setValueAtTime(drum.freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    setActive(drum.id);
    setTimeout(() => setActive(null), 100);
  };

  return (
    <div className="flex flex-col items-center h-full p-4">
      <div className="flex items-center gap-2 mb-4">
        <Volume2 size={18} className="text-purple-500" />
        <h2 className="text-lg font-semibold">Drum Machine</h2>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {drums.map((d) => (
          <button key={d.id} onClick={() => play(d)}
            className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              active === d.id ? 'bg-purple-500 text-white scale-95' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10'
            }`}>
            <span className="text-lg font-bold">{d.id}</span>
            <span className="text-xs">{d.name}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">Click pads to play sounds</p>
    </div>
  );
}
