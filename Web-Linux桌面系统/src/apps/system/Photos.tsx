import { useState } from 'react';
import { Grid, ImageIcon, Heart, Share, Trash2 } from 'lucide-react';

const photos = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  color: ['from-red-400 to-pink-500', 'from-blue-400 to-cyan-500', 'from-green-400 to-emerald-500', 'from-amber-400 to-orange-500', 'from-purple-400 to-indigo-500', 'from-rose-400 to-red-500'][i % 6],
  liked: i % 3 === 0,
}));

export default function Photos() {
  const [selected, setSelected] = useState<number | null>(null);
  const [liked, setLiked] = useState<Set<number>>(new Set(photos.filter((p) => p.liked).map((p) => p.id)));

  const toggleLike = (id: number) => {
    const next = new Set(liked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setLiked(next);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-gray-200/30 dark:border-gray-700/30">
        <h2 className="text-sm font-semibold">All Photos ({photos.length})</h2>
        <div className="flex gap-1">
          <button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Grid size={14} /></button>
          
        </div>
      </div>
      {selected ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className={`w-full max-w-md aspect-video rounded-2xl bg-gradient-to-br ${photos.find((p) => p.id === selected)?.color} shadow-lg flex items-center justify-center`}>
            <ImageIcon size={64} className="text-white/50" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => toggleLike(selected)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><Heart size={18} className={liked.has(selected) ? 'text-red-500' : ''} /></button>
            <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><Share size={18} /></button>
            <button onClick={() => setSelected(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><Trash2 size={18} /></button>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <button key={p.id} onClick={() => setSelected(p.id)} className="aspect-square rounded-xl bg-gradient-to-br shadow-md hover:scale-[1.02] transition-transform" style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}>
                <div className={`w-full h-full rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center`}>
                  <ImageIcon size={24} className="text-white/50" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
