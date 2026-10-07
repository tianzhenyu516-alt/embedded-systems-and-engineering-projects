import { useState, useEffect } from 'react';
import { Cpu, HardDrive, MemoryStick, Battery } from 'lucide-react';

export default function SystemInfo() {
  const [cpu, setCpu] = useState(23);
  const [ram, setRam] = useState(42);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpu(Math.floor(Math.random() * 40) + 10);
      setRam(Math.floor(Math.random() * 30) + 30);
      setUptime((u) => u + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-2">A</div>
        <h2 className="text-lg font-semibold">Web Desktop Web</h2>
        <p className="text-xs text-gray-500">Version 1.0 (Build 24A123)</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-2"><Cpu size={14} className="text-blue-500" /><span className="text-xs text-gray-500">CPU</span></div>
          <div className="text-xl font-semibold">{cpu}%</div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1"><div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${cpu}%` }} /></div>
        </div>
        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-2"><MemoryStick size={14} className="text-green-500" /><span className="text-xs text-gray-500">Memory</span></div>
          <div className="text-xl font-semibold">{ram}%</div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1"><div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${ram}%` }} /></div>
        </div>
        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-2"><HardDrive size={14} className="text-purple-500" /><span className="text-xs text-gray-500">Storage</span></div>
          <div className="text-xl font-semibold">128 GB</div>
          <div className="text-xs text-gray-500">256 GB total</div>
        </div>
        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-2"><Battery size={14} className="text-green-500" /><span className="text-xs text-gray-500">Battery</span></div>
          <div className="text-xl font-semibold">87%</div>
          <div className="text-xs text-gray-500">8 hours remaining</div>
        </div>
      </div>
      <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
        <div className="flex items-center justify-between text-sm"><span>Uptime</span><span className="font-mono">{formatUptime(uptime)}</span></div>
      </div>
    </div>
  );
}
