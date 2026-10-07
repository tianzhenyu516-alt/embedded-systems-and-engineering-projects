import { useState } from 'react';
import { Sun, Cloud, CloudRain, Wind, Droplets, Eye, Thermometer, CloudSun } from 'lucide-react';

const weatherData = [
  { day: 'Mon', high: 22, low: 14, icon: Sun, condition: 'Sunny' },
  { day: 'Tue', high: 20, low: 13, icon: CloudSun, condition: 'Partly Cloudy' },
  { day: 'Wed', high: 18, low: 12, icon: Cloud, condition: 'Cloudy' },
  { day: 'Thu', high: 16, low: 11, icon: CloudRain, condition: 'Rainy' },
  { day: 'Fri', high: 19, low: 12, icon: CloudSun, condition: 'Partly Cloudy' },
  { day: 'Sat', high: 23, low: 15, icon: Sun, condition: 'Sunny' },
  { day: 'Sun', high: 21, low: 14, icon: CloudSun, condition: 'Partly Cloudy' },
];

const cities = ['San Francisco', 'New York', 'London', 'Tokyo', 'Paris', 'Sydney'];

export default function Weather() {
  const [city, setCity] = useState('San Francisco');
  const current = weatherData[0];
  const CurrentIcon = current.icon;

  return (
    <div className="flex flex-col h-full p-4">
      <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full p-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm outline-none mb-4">
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="text-center mb-4">
        <CurrentIcon size={64} className="mx-auto text-amber-400 mb-2" />
        <div className="text-5xl font-light">{current.high}°</div>
        <div className="text-sm text-gray-500 mt-1">{current.condition}</div>
        <div className="text-xs text-gray-500">H:{current.high}° L:{current.low}°</div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex items-center gap-2">
          <Wind size={14} className="text-gray-500" />
          <div><div className="text-xs text-gray-500">Wind</div><div className="text-sm font-medium">12 km/h</div></div>
        </div>
        <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex items-center gap-2">
          <Droplets size={14} className="text-blue-400" />
          <div><div className="text-xs text-gray-500">Humidity</div><div className="text-sm font-medium">68%</div></div>
        </div>
        <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex items-center gap-2">
          <Eye size={14} className="text-gray-500" />
          <div><div className="text-xs text-gray-500">Visibility</div><div className="text-sm font-medium">16 km</div></div>
        </div>
        <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex items-center gap-2">
          <Thermometer size={14} className="text-red-400" />
          <div><div className="text-xs text-gray-500">Feels Like</div><div className="text-sm font-medium">{current.high + 2}°</div></div>
        </div>
      </div>
      <div className="flex-1">
        <div className="text-xs font-medium text-gray-500 mb-2">7-Day Forecast</div>
        <div className="space-y-1">
          {weatherData.map((d) => {
            const Icon = d.icon;
            return (
              <div key={d.day} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                <span className="text-sm w-10">{d.day}</span>
                <Icon size={16} className="text-gray-500" />
                <span className="text-xs text-gray-500 w-24 text-center">{d.condition}</span>
                <div className="flex gap-1 items-center w-20 justify-end">
                  <span className="text-sm font-medium">{d.high}°</span>
                  <div className="w-12 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-amber-400" style={{ width: `${(d.high / 30) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{d.low}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
