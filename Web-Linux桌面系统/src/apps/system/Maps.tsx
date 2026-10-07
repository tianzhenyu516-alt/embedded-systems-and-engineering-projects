import { useState } from 'react';
import { Search, MapPin, Navigation, Layers } from 'lucide-react';

const landmarks = [
  { id: 1, name: 'City Hall', x: 50, y: 40, type: 'government' },
  { id: 2, name: 'Central Park', x: 35, y: 25, type: 'park' },
  { id: 3, name: 'Tech Tower', x: 65, y: 35, type: 'tech' },
  { id: 4, name: 'Grand Mall', x: 45, y: 55, type: 'shopping' },
  { id: 5, name: 'Harbor Bay', x: 20, y: 70, type: 'water' },
  { id: 6, name: 'University', x: 75, y: 20, type: 'education' },
  { id: 7, name: 'Airport', x: 85, y: 75, type: 'transport' },
  { id: 8, name: 'Hospital', x: 30, y: 50, type: 'health' },
];

export default function Maps() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [routeMode, setRouteMode] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = landmarks.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));
  const selectedLandmark = landmarks.find((l) => l.id === selected);

  const getColor = (type: string) => {
    switch (type) {
      case 'park': return 'bg-green-500';
      case 'water': return 'bg-blue-500';
      case 'tech': return 'bg-purple-500';
      case 'shopping': return 'bg-orange-500';
      case 'government': return 'bg-red-500';
      case 'education': return 'bg-indigo-500';
      case 'transport': return 'bg-gray-500';
      case 'health': return 'bg-pink-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 relative bg-gradient-to-br from-green-100 via-yellow-50 to-blue-100 dark:from-green-900/30 dark:via-yellow-900/20 dark:to-blue-900/30 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        {landmarks.map((l) => (
          <button key={l.id} onClick={() => setSelected(l.id)} className="absolute transform -translate-x-1/2 -translate-y-1/2 group" style={{ left: `${l.x}%`, top: `${l.y}%` }}>
            <div className={`w-6 h-6 rounded-full ${getColor(l.type)} flex items-center justify-center shadow-md transition-transform ${selected === l.id ? 'scale-125 ring-2 ring-white' : 'group-hover:scale-110'}`}>
              <MapPin size={12} className="text-white" />
            </div>
            <span className={`absolute top-7 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded shadow ${selected === l.id ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>{l.name}</span>
          </button>
        ))}
        <div className="absolute top-3 right-3 flex gap-1">
          <button onClick={() => setRouteMode(!routeMode)} className={`p-2 rounded-xl shadow ${routeMode ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800'}`}><Navigation size={16} /></button>
          <button className="p-2 rounded-xl shadow bg-white dark:bg-gray-800"><Layers size={16} /></button>
        </div>
      </div>
      <div className="w-56 border-l border-gray-200/30 dark:border-gray-700/30 p-3">
        <div className="relative mb-3">
          <Search size={12} className="absolute left-2 top-2 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search places" className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs outline-none" />
        </div>
        {routeMode && (
          <div className="space-y-2 mb-3">
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" className="w-full px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs outline-none" />
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" className="w-full px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs outline-none" />
            <button className="w-full py-1.5 rounded-lg bg-blue-500 text-white text-xs">Get Directions</button>
          </div>
        )}
        <div className="space-y-1">
          {filtered.map((l) => (
            <button key={l.id} onClick={() => setSelected(l.id)} className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all ${selected === l.id ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <div className={`w-2 h-2 rounded-full ${getColor(l.type)}`} />
              {l.name}
            </button>
          ))}
        </div>
        {selectedLandmark && (
          <div className="mt-3 p-2 rounded-xl bg-black/5 dark:bg-white/5">
            <div className="font-medium text-sm">{selectedLandmark.name}</div>
            <div className="text-xs text-gray-500 capitalize">{selectedLandmark.type}</div>
          </div>
        )}
      </div>
    </div>
  );
}
