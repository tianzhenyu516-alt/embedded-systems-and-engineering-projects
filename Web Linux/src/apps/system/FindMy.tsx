import { useState } from 'react';
import { MapPin, Battery } from 'lucide-react';

const devices = [
  { id: 1, name: 'iPhone 15 Pro', type: 'phone', battery: 78, location: 'Home', lastSeen: 'Now', color: 'bg-blue-500' },
  { id: 2, name: 'MacBook Pro', type: 'laptop', battery: 45, location: 'Office', lastSeen: '2h ago', color: 'bg-gray-500' },
  { id: 3, name: 'AirPods Pro', type: 'audio', battery: 92, location: 'Nearby', lastSeen: 'Now', color: 'bg-white' },
  { id: 4, name: 'Apple Watch', type: 'watch', battery: 34, location: 'Home', lastSeen: '5m ago', color: 'bg-black' },
];

const people = [
  { id: 1, name: 'Alice', location: 'Downtown', status: 'active' },
  { id: 2, name: 'Bob', location: 'Airport', status: 'active' },
];

export default function FindMy() {
  const [tab, setTab] = useState<'devices' | 'people'>('devices');

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative bg-gradient-to-br from-green-100 via-yellow-50 to-blue-100 dark:from-green-900/30 dark:via-yellow-900/20 dark:to-blue-900/30">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
          </div>
        </div>
        {devices.slice(0, 2).map((d, i) => (
          <div key={d.id} className="absolute" style={{ top: `${30 + i * 25}%`, left: `${20 + i * 30}%` }}>
            <div className={`w-8 h-8 rounded-full ${d.color} flex items-center justify-center shadow-md`}>
              <MapPin size={14} className={d.color.includes('white') || d.color.includes('amber') ? 'text-black' : 'text-white'} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-3 border-b border-gray-200/30 dark:border-gray-700/30">
        <button onClick={() => setTab('devices')} className={`flex-1 py-1.5 rounded-full text-xs ${tab === 'devices' ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}>Devices</button>
        <button onClick={() => setTab('people')} className={`flex-1 py-1.5 rounded-full text-xs ${tab === 'people' ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}>People</button>
      </div>
      <div className="max-h-40 overflow-y-auto p-3">
        {tab === 'devices' ? (
          <div className="space-y-2">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <div className={`w-8 h-8 rounded-lg ${d.color} flex items-center justify-center`}>
                  <span className={`text-xs font-bold ${d.color.includes('white') || d.color.includes('amber') ? 'text-black' : 'text-white'}`}>{d.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-gray-500">{d.location} · {d.lastSeen}</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Battery size={12} /> {d.battery}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">{p.name.charAt(0)}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.location}</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
