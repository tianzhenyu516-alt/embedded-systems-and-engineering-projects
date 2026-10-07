import { useState, useEffect } from 'react';
import { Timer, AlarmClock, Globe, Pause, Play, RotateCcw } from 'lucide-react';

export default function Clock() {
  const [tab, setTab] = useState<'world' | 'alarm' | 'stopwatch' | 'timer'>('world');
  const [time, setTime] = useState(new Date());
  const [swRunning, setSwRunning] = useState(false);
  const [swTime, setSwTime] = useState(0);
  const [swLaps, setSwLaps] = useState<number[]>([]);
  const [timerMin, setTimerMin] = useState(5);
  const [timerSec, setTimerSec] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerLeft, setTimerLeft] = useState(300);
  const [alarms] = useState([
    { id: 1, time: '07:00', label: 'Morning', enabled: true },
    { id: 2, time: '08:30', label: 'Work', enabled: true },
    { id: 3, time: '22:00', label: 'Sleep', enabled: false },
  ]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!swRunning) return;
    const interval = setInterval(() => setSwTime((t) => t + 10), 10);
    return () => clearInterval(interval);
  }, [swRunning]);

  useEffect(() => {
    if (!timerRunning || timerLeft <= 0) return;
    const interval = setInterval(() => setTimerLeft((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerLeft]);

  const cities = [
    { name: 'Local', offset: 0 },
    { name: 'New York', offset: -5 },
    { name: 'London', offset: 0 },
    { name: 'Tokyo', offset: 9 },
    { name: 'Sydney', offset: 11 },
    { name: 'Paris', offset: 1 },
  ];

  const formatTime = (d: Date, offset = 0) => {
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const nd = new Date(utc + offset * 3600000);
    return nd.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMs = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center gap-4 p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        {([['world', Globe], ['alarm', AlarmClock], ['stopwatch', Timer], ['timer', Timer]] as const).map(([t, Icon]) => (
          <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${tab === t ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
            <Icon size={14} /> {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {tab === 'world' && (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-5xl font-light">{formatTime(time)}</div>
              <div className="text-sm text-gray-500 mt-1">{time.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            </div>
            <div className="space-y-2 mt-4">
              {cities.map((c) => (
                <div key={c.name} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-lg">{formatTime(time, c.offset)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'alarm' && (
          <div className="space-y-2">
            {alarms.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <div>
                  <div className="text-2xl font-light">{a.time}</div>
                  <div className="text-xs text-gray-500">{a.label}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={a.enabled} className="sr-only peer" />
                  <div className="w-10 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
                </label>
              </div>
            ))}
          </div>
        )}
        {tab === 'stopwatch' && (
          <div className="flex flex-col items-center">
            <div className="text-5xl font-mono font-light mt-4">{formatMs(swTime)}</div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setSwRunning(!swRunning)} className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600">
                {swRunning ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button onClick={() => { setSwTime(0); setSwLaps([]); setSwRunning(false); }} className="p-3 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400">
                <RotateCcw size={20} />
              </button>
              <button onClick={() => setSwLaps([swTime, ...swLaps].slice(0, 10))} className="p-3 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400">
                <Timer size={20} />
              </button>
            </div>
            <div className="w-full mt-4 space-y-1">
              {swLaps.map((lap, i) => (
                <div key={i} className="flex justify-between px-3 py-1 text-sm text-gray-500">
                  <span>Lap {swLaps.length - i}</span>
                  <span className="font-mono">{formatMs(lap)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'timer' && (
          <div className="flex flex-col items-center">
            <div className="text-6xl font-mono font-light mt-4">
              {String(Math.floor(timerLeft / 60)).padStart(2, '0')}:{String(timerLeft % 60).padStart(2, '0')}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setTimerRunning(!timerRunning)} className="px-6 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600">
                {timerRunning ? 'Pause' : 'Start'}
              </button>
              <button onClick={() => { setTimerRunning(false); setTimerLeft(timerMin * 60 + timerSec); }} className="px-6 py-2 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400">
                Reset
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              {[1, 3, 5, 10, 15, 25].map((m) => (
                <button key={m} onClick={() => { setTimerMin(m); setTimerSec(0); setTimerLeft(m * 60); setTimerRunning(false); }} className="px-3 py-1 rounded-full text-xs bg-black/5 dark:bg-white/5 hover:bg-black/10">
                  {m}m
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
