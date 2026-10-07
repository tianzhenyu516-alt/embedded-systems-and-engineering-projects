import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Clock } from 'lucide-react';

const podcasts = [
  { id: 1, title: 'Tech Talk Daily', episode: '#234 - AI Revolution', duration: '45:30', progress: 60, liked: true, color: 'bg-blue-500' },
  { id: 2, title: 'Science Weekly', episode: 'Quantum Computing 101', duration: '32:15', progress: 0, liked: false, color: 'bg-green-500' },
  { id: 3, title: 'Design Matters', episode: 'Minimalism in UI', duration: '28:45', progress: 80, liked: true, color: 'bg-purple-500' },
  { id: 4, title: 'Startup Stories', episode: 'From Garage to IPO', duration: '55:00', progress: 0, liked: false, color: 'bg-orange-500' },
];

export default function Podcasts() {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState<Set<number>>(new Set([1, 3]));
  const podcast = podcasts[current];

  const toggleLike = (id: number) => {
    const next = new Set(liked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setLiked(next);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className={`w-40 h-40 rounded-2xl ${podcast.color} flex items-center justify-center shadow-lg mb-4`}>
          <span className="text-white text-4xl font-bold">{podcast.title.charAt(0)}</span>
        </div>
        <h3 className="text-lg font-semibold text-center">{podcast.title}</h3>
        <p className="text-sm text-gray-500 text-center">{podcast.episode}</p>
      </div>
      <div className="px-6 pb-2">
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${podcast.progress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{Math.floor(podcast.duration.split(':')[0] as unknown as number * podcast.progress / 100)}:00</span>
          <span>{podcast.duration}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 p-4">
        <button onClick={() => toggleLike(podcast.id)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
          <Heart size={18} className={liked.has(podcast.id) ? 'text-red-500' : 'text-gray-400'} />
        </button>
        <button onClick={() => setCurrent((c) => (c - 1 + podcasts.length) % podcasts.length)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><SkipBack size={20} /></button>
        <button onClick={() => setPlaying(!playing)} className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600">
          {playing ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button onClick={() => setCurrent((c) => (c + 1) % podcasts.length)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><SkipForward size={20} /></button>
        <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><Clock size={18} className="text-gray-400" /></button>
      </div>
    </div>
  );
}
