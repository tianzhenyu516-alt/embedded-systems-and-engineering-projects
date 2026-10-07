import { useState } from 'react';
import { Plus, Play, Zap } from 'lucide-react';

const initialShortcuts = [
  { id: 1, name: 'Good Morning', icon: 'sun', actions: ['Turn on lights', 'Play music', 'Check weather'], color: 'bg-amber-500' },
  { id: 2, name: 'Work Mode', icon: 'briefcase', actions: ['Open Terminal', 'Open Notes', 'Do Not Disturb'], color: 'bg-blue-500' },
  { id: 3, name: 'Bedtime', icon: 'moon', actions: ['Turn off lights', 'Set alarm', 'Enable night mode'], color: 'bg-indigo-500' },
];

export default function Shortcuts() {
  const [shortcuts, setShortcuts] = useState(initialShortcuts);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [running, setRunning] = useState<number | null>(null);

  const run = (id: number) => {
    setRunning(id);
    setTimeout(() => setRunning(null), 2000);
  };

  const addShortcut = () => {
    if (!newName.trim()) return;
    setShortcuts([...shortcuts, { id: Date.now(), name: newName, icon: 'zap', actions: ['New action'], color: 'bg-gray-500' }]);
    setNewName(''); setShowAdd(false);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Shortcuts</h2>
        <button onClick={() => setShowAdd(true)} className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600"><Plus size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {shortcuts.map((s) => (
          <div key={s.id} className={`p-4 rounded-2xl ${s.color} text-white relative overflow-hidden`}>
            <div className="absolute top-2 right-2 opacity-20"><Zap size={48} /></div>
            <div className="relative z-10">
              <h3 className="font-semibold text-sm mb-2">{s.name}</h3>
              <div className="space-y-0.5">
                {s.actions.map((a, i) => <div key={i} className="text-xs opacity-80">{a}</div>)}
              </div>
              <button onClick={() => run(s.id)} className="mt-3 px-3 py-1 rounded-full bg-white/20 text-xs hover:bg-white/30 flex items-center gap-1">
                {running === s.id ? 'Running...' : <><Play size={10} /> Run</>}
              </button>
            </div>
          </div>
        ))}
      </div>
      {showAdd && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-semibold mb-3">New Shortcut</h3>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Shortcut name" className="w-full p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm">Cancel</button>
              <button onClick={addShortcut} className="flex-1 p-2 rounded-lg bg-blue-500 text-white text-sm">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
