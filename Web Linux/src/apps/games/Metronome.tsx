import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Minus } from 'lucide-react';

export default function Metronome() {
  const [bpm, setBpm] = useState<number>(120);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState<number>(0);
  const audioCtx = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    const ms = 60000 / bpm;
    intervalRef.current = setInterval(() => {
      setBeat((b: number) => (b + 1) % 4);
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 800;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    }, ms);
    return () => clearInterval(intervalRef.current);
  }, [playing, bpm]);

  return (
    <div className="flex flex-col items-center h-full p-4">
      <h2 className="text-lg font-semibold mb-4">Metronome</h2>
      <div className="flex gap-2 mb-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${beat === i ? 'bg-blue-500 text-white scale-110' : 'bg-black/5 dark:bg-white/5'}`}>
            {i + 1}
          </div>
        ))}
      </div>
      <div className="text-5xl font-bold mb-4">{bpm}</div>
      <div className="text-xs text-gray-500 mb-4">BPM</div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setBpm(Math.max(40, bpm - 5))} className="p-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10"><Minus size={16} /></button>
        <input type="range" min="40" max="240" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-40 accent-blue-500" />
        <button onClick={() => setBpm(Math.min(240, bpm + 5))} className="p-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10"><Plus size={16} /></button>
      </div>
      <button onClick={() => setPlaying(!playing)} className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all ${playing ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
        {playing ? <Pause size={24} /> : <Play size={24} />}
      </button>
    </div>
  );
}
