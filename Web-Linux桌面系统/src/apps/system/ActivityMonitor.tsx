import { useState, useEffect } from 'react';
import { Cpu, MemoryStick, Activity } from 'lucide-react';

const initialProcesses = [
  { id: 1, name: 'WindowServer', pid: 123, cpu: 2.1, mem: 156, user: 'root' },
  { id: 2, name: 'kernel_task', pid: 0, cpu: 5.3, mem: 412, user: 'root' },
  { id: 3, name: 'Safari', pid: 456, cpu: 12.7, mem: 890, user: 'guest' },
  { id: 4, name: 'Terminal', pid: 789, cpu: 0.8, mem: 45, user: 'guest' },
  { id: 5, name: 'Music', pid: 321, cpu: 3.2, mem: 234, user: 'guest' },
  { id: 6, name: ' Finder', pid: 654, cpu: 1.5, mem: 178, user: 'guest' },
  { id: 7, name: 'Mail', pid: 987, cpu: 0.3, mem: 89, user: 'guest' },
  { id: 8, name: 'Settings', pid: 147, cpu: 0.9, mem: 67, user: 'guest' },
  { id: 9, name: 'docker', pid: 258, cpu: 8.4, mem: 512, user: 'root' },
  { id: 10, name: 'node', pid: 369, cpu: 15.2, mem: 1024, user: 'guest' },
  { id: 11, name: 'postgres', pid: 741, cpu: 1.1, mem: 345, user: '_postgres' },
  { id: 12, name: 'redis-server', pid: 852, cpu: 0.5, mem: 28, user: '_redis' },
];

export default function ActivityMonitor() {
  const [processes, setProcesses] = useState(initialProcesses);
  const [sortBy, setSortBy] = useState<'cpu' | 'mem'>('cpu');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setProcesses((ps) => ps.map((p) => ({ ...p, cpu: Math.max(0.1, p.cpu + (Math.random() - 0.5) * 3), mem: Math.max(10, p.mem + (Math.random() - 0.5) * 20) })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const filtered = processes.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => b[sortBy] - a[sortBy]);
  const totalCpu = processes.reduce((s, p) => s + p.cpu, 0);
  const totalMem = processes.reduce((s, p) => s + p.mem, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-3 gap-3 p-3">
        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-center">
          <Cpu size={20} className="mx-auto text-blue-500 mb-1" />
          <div className="text-lg font-semibold">{totalCpu.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">CPU Load</div>
        </div>
        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-center">
          <MemoryStick size={20} className="mx-auto text-green-500 mb-1" />
          <div className="text-lg font-semibold">{(totalMem / 1024).toFixed(1)} GB</div>
          <div className="text-xs text-gray-500">Memory</div>
        </div>
        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-center">
          <Activity size={20} className="mx-auto text-purple-500 mb-1" />
          <div className="text-lg font-semibold">{processes.length}</div>
          <div className="text-xs text-gray-500">Processes</div>
        </div>
      </div>
      <div className="px-3 pb-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search processes" className="w-full px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none" />
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="text-gray-500 sticky top-0 bg-inherit">
            <tr>
              <th className="text-left px-3 py-1">Process</th>
              <th className="text-right px-3 py-1 cursor-pointer" onClick={() => setSortBy('cpu')}>CPU %</th>
              <th className="text-right px-3 py-1 cursor-pointer" onClick={() => setSortBy('mem')}>Mem</th>
              <th className="text-left px-3 py-1">User</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                <td className="px-3 py-1.5 font-medium">{p.name}</td>
                <td className="px-3 py-1.5 text-right">{p.cpu.toFixed(1)}</td>
                <td className="px-3 py-1.5 text-right">{p.mem.toFixed(0)} MB</td>
                <td className="px-3 py-1.5 text-gray-500">{p.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
