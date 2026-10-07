import { useState } from 'react';
import { Plus, Check, Trash2, Flag } from 'lucide-react';

const initialLists = [
  { id: 1, name: 'Today', color: 'bg-blue-500' },
  { id: 2, name: 'Scheduled', color: 'bg-red-500' },
  { id: 3, name: 'All', color: 'bg-gray-500' },
  { id: 4, name: 'Flagged', color: 'bg-orange-500' },
];

const initialTasks = [
  { id: 1, title: 'Buy groceries', done: false, listId: 1, flagged: true, due: 'Today' },
  { id: 2, title: 'Call dentist', done: false, listId: 1, flagged: false, due: 'Today' },
  { id: 3, title: 'Submit report', done: true, listId: 2, flagged: true, due: 'Tomorrow' },
  { id: 4, title: 'Book flight', done: false, listId: 2, flagged: false, due: 'Next week' },
  { id: 5, title: 'Water plants', done: true, listId: 1, flagged: false, due: 'Today' },
];

export default function Reminders() {
  const [tasks, setTasks] = useState(initialTasks);
  const [lists] = useState(initialLists);
  const [activeList, setActiveList] = useState(1);
  const [newTask, setNewTask] = useState('');

  const filtered = tasks.filter((t) => {
    if (activeList === 1) return t.due === 'Today';
    if (activeList === 2) return t.due !== 'Today';
    if (activeList === 3) return true;
    if (activeList === 4) return t.flagged;
    return true;
  });

  const toggleTask = (id: number) => setTasks(tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = (id: number) => setTasks(tasks.filter((t) => t.id !== id));
  const addTask = () => { if (newTask.trim()) { setTasks([...tasks, { id: Date.now(), title: newTask, done: false, listId: activeList, flagged: false, due: 'Today' }]); setNewTask(''); } };

  return (
    <div className="flex h-full">
      <div className="w-40 border-r border-gray-200/30 dark:border-gray-700/30 p-3">
        <div className="space-y-1">
          {lists.map((l) => (
            <button key={l.id} onClick={() => setActiveList(l.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${activeList === l.id ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <div className={`w-3 h-3 rounded-full ${l.color}`} />
              {l.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4">
        <h2 className="text-lg font-semibold mb-3">{lists.find((l) => l.id === activeList)?.name}</h2>
        <div className="flex gap-2 mb-4">
          <input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="New reminder" className="flex-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm outline-none" />
          <button onClick={addTask} className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600"><Plus size={18} /></button>
        </div>
        <div className="space-y-1">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 group">
              <button onClick={() => toggleTask(t.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${t.done ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>
                {t.done && <Check size={12} className="text-white" />}
              </button>
              <span className={`flex-1 text-sm ${t.done ? 'line-through text-gray-400' : ''}`}>{t.title}</span>
              {t.flagged && <Flag size={12} className="text-orange-500" />}
              <button onClick={() => deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 transition-all"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
