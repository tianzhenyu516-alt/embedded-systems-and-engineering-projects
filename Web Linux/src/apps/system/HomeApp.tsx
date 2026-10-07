import { useState } from 'react';
import { Lightbulb, Thermometer, Lock, Tv, Speaker, Zap, Droplets } from 'lucide-react';

const devices = [
  { id: 1, name: 'Living Room Light', type: 'light', on: true, icon: Lightbulb },
  { id: 2, name: 'Bedroom Light', type: 'light', on: false, icon: Lightbulb },
  { id: 3, name: 'Thermostat', type: 'thermostat', value: 22, icon: Thermometer },
  { id: 4, name: 'Front Door', type: 'lock', on: true, icon: Lock },
  { id: 5, name: 'TV', type: 'tv', on: false, icon: Tv },
  { id: 6, name: 'Speaker', type: 'speaker', on: true, icon: Speaker },
  { id: 7, name: 'Humidifier', type: 'fan', on: true, icon: Droplets },
  { id: 8, name: 'Smart Plug', type: 'plug', on: false, icon: Zap },
];

const scenes = [
  { id: 1, name: 'Good Morning', color: 'bg-amber-400' },
  { id: 2, name: 'Good Night', color: 'bg-indigo-500' },
  { id: 3, name: 'Movie Time', color: 'bg-purple-500' },
  { id: 4, name: 'Away', color: 'bg-green-500' },
];

export default function HomeApp() {
  const [devs, setDevs] = useState<any[]>(devices);
  const [temp, setTemp] = useState(22);

  const toggleDevice = (id: number) => setDevs(devs.map((d) => d.id === id ? { ...d, on: !d.on } : d));

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-lg font-semibold mb-3">My Home</h2>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {scenes.map((s) => (
          <button key={s.id} className={`${s.color} text-white p-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity`}>
            {s.name}
          </button>
        ))}
      </div>
      <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase">Devices</h3>
      <div className="grid grid-cols-2 gap-2">
        {devs.map((d) => {
          const Icon = d.icon;
          return (
            <button key={d.id} onClick={() => toggleDevice(d.id)} className={`p-3 rounded-xl text-left transition-all ${d.on ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-black/5 dark:bg-white/5'}`}>
              <Icon size={20} className={d.on ? 'text-amber-500' : 'text-gray-400'} />
              <div className="text-xs font-medium mt-2">{d.name}</div>
              <div className="text-xs text-gray-500">{d.on ? 'On' : 'Off'}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 p-3 rounded-xl bg-black/5 dark:bg-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Temperature</span>
          <span className="text-sm font-bold">{temp}°C</span>
        </div>
        <input type="range" min="16" max="30" value={temp} onChange={(e) => setTemp(Number(e.target.value))} className="w-full accent-blue-500" />
      </div>
    </div>
  );
}
