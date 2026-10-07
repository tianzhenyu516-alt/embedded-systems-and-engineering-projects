import { useState } from 'react';
import { Search, Star, Gamepad2, Wrench, Palette, BookOpen } from 'lucide-react';

const categories = [
  { id: 'all', label: 'All', icon: Star },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'productivity', label: 'Tools', icon: Wrench },
  { id: 'creative', label: 'Creative', icon: Palette },
  { id: 'education', label: 'Education', icon: BookOpen },
];

const apps = [
  { id: 1, name: 'Pro Editor', category: 'creative', rating: 4.8, downloads: '12K', price: 'Free', color: 'bg-purple-500' },
  { id: 2, name: 'Task Master', category: 'productivity', rating: 4.6, downloads: '8K', price: 'Free', color: 'bg-blue-500' },
  { id: 3, name: 'Pixel Art', category: 'games', rating: 4.9, downloads: '25K', price: 'Free', color: 'bg-green-500' },
  { id: 4, name: 'Learn JS', category: 'education', rating: 4.7, downloads: '5K', price: 'Free', color: 'bg-amber-500' },
  { id: 5, name: 'Code IDE', category: 'productivity', rating: 4.5, downloads: '15K', price: 'Free', color: 'bg-indigo-500' },
  { id: 6, name: 'Music Maker', category: 'creative', rating: 4.4, downloads: '3K', price: 'Free', color: 'bg-pink-500' },
];

export default function AppStore() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = apps.filter((a) => (category === 'all' || a.category === category) && a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full p-4">
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search apps" className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm outline-none" />
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${category === c.id ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}>
            <c.icon size={12} /> {c.label}
          </button>
        ))}
      </div>
      <h3 className="text-sm font-semibold mb-2">Discover</h3>
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.map((a) => (
          <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5">
            <div className={`w-12 h-12 rounded-xl ${a.color} flex items-center justify-center text-white font-bold`}>{a.name.charAt(0)}</div>
            <div className="flex-1">
              <div className="text-sm font-medium">{a.name}</div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Star size={10} className="text-amber-400" /> {a.rating} · {a.downloads}
              </div>
            </div>
            <button className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium hover:bg-blue-500/20">
              {a.price}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
