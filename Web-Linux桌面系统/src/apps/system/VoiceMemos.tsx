import { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, Square, Trash2 } from 'lucide-react';

interface Recording {
  id: number;
  name: string;
  duration: number;
  date: string;
}

export default function VoiceMemos() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordings, setRecordings] = useState<Recording[]>([
    { id: 1, name: 'Recording 1', duration: 45, date: 'Today' },
    { id: 2, name: 'Meeting Notes', duration: 180, date: 'Yesterday' },
    { id: 3, name: 'Idea', duration: 12, date: '2 days ago' },
  ]);
  const [playing, setPlaying] = useState<number | null>(null);
  const [time, setTime] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const draw = () => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = isRecording ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < w; x += 2) {
        const amplitude = isRecording ? 30 : 10;
        const y = h / 2 + Math.sin(x * 0.05 + Date.now() * 0.01) * amplitude * Math.random();
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      requestAnimationFrame(draw);
    };
    const anim = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(anim);
  }, [isRecording]);

  const startRecording = () => {
    setIsRecording(true);
    setTime(0);
    intervalRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    clearInterval(intervalRef.current);
    setRecordings([{ id: Date.now(), name: `Recording ${recordings.length + 1}`, duration: time, date: 'Just now' }, ...recordings]);
    setTime(0);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="flex-1 relative">
        <canvas ref={canvasRef} width={400} height={200} className="w-full h-full" />
        {isRecording && <div className="absolute top-4 left-1/2 -translate-x-1/2 text-red-500 text-sm font-medium animate-pulse">Recording {formatTime(time)}</div>}
      </div>
      <div className="flex justify-center gap-4 p-4">
        {!isRecording ? (
          <button onClick={startRecording} className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors">
            <Mic size={24} />
          </button>
        ) : (
          <button onClick={stopRecording} className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors">
            <Square size={24} />
          </button>
        )}
      </div>
      <div className="max-h-32 overflow-y-auto px-4 pb-4">
        {recordings.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-700">
            <div>
              <div className="text-sm">{r.name}</div>
              <div className="text-xs text-gray-500">{r.date}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{formatTime(r.duration)}</span>
              <button onClick={() => setPlaying(playing === r.id ? null : r.id)} className="p-1.5 rounded-full bg-gray-700 hover:bg-gray-600">
                {playing === r.id ? <Pause size={12} /> : <Play size={12} />}
              </button>
              <button onClick={() => setRecordings(recordings.filter((rec) => rec.id !== r.id))} className="p-1.5 rounded-full hover:bg-red-900/30 text-red-400">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
