import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Heart, ListMusic } from 'lucide-react';

const songs = [
  { id: 1, title: 'Midnight Dreams', artist: 'Luna Star', duration: 234, color: 'from-purple-500 to-pink-500' },
  { id: 2, title: 'Ocean Waves', artist: 'Blue Horizon', duration: 198, color: 'from-blue-500 to-cyan-500' },
  { id: 3, title: 'Golden Hour', artist: 'Sun Chaser', duration: 256, color: 'from-amber-500 to-orange-500' },
  { id: 4, title: 'Forest Rain', artist: 'Nature Sounds', duration: 312, color: 'from-green-500 to-emerald-500' },
  { id: 5, title: 'City Lights', artist: 'Night Owl', duration: 189, color: 'from-indigo-500 to-purple-500' },
];

export default function MusicApp() {
  const [current, setCurrent] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState<number[]>([1, 3]);
  const [_volume] = useState(75);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const song = songs[current];

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => { if (p >= song.duration) { setPlaying(false); return 0; } return p + 1; });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, song]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className={`w-48 h-48 rounded-2xl bg-gradient-to-br ${song.color} shadow-lg flex items-center justify-center mb-4`}>
          <ListMusic size={48} className="text-white/50" />
        </div>
        <h3 className="text-lg font-semibold">{song.title}</h3>
        <p className="text-sm text-gray-500">{song.artist}</p>
      </div>
      <div className="px-6 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500 w-10 text-right">{formatTime(progress)}</span>
          <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(progress / song.duration) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-500 w-10">{formatTime(song.duration)}</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><Shuffle size={16} className="text-gray-500" /></button>
          <button onClick={() => setCurrent((c) => (c - 1 + songs.length) % songs.length)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><SkipBack size={20} /></button>
          <button onClick={() => setPlaying(!playing)} className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600">
            {playing ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button onClick={() => { setCurrent((c) => (c + 1) % songs.length); setProgress(0); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><SkipForward size={20} /></button>
          <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><Repeat size={16} className="text-gray-500" /></button>
        </div>
        <div className="mt-3 space-y-1 max-h-24 overflow-y-auto">
          {songs.map((s, i) => (
            <button key={s.id} onClick={() => { setCurrent(i); setProgress(0); }} className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded-lg text-sm ${current === i ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <span className="text-xs w-4">{i + 1}</span>
              <span className="flex-1 truncate">{s.title}</span>
              <button onClick={(e) => { e.stopPropagation(); setLiked(liked.includes(s.id) ? liked.filter((id) => id !== s.id) : [...liked, s.id]); }}>
                <Heart size={12} className={liked.includes(s.id) ? 'text-red-400' : 'text-gray-400'} />
              </button>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
