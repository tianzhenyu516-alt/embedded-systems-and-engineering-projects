import { useState } from 'react';
import { Plus, GripVertical } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  tag: string;
  tagColor: string;
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

export default function Kanban() {
  const [columns, setColumns] = useState<Column[]>([
    { id: 'todo', title: 'To Do', color: 'bg-gray-500', tasks: [
      { id: 1, title: 'Design homepage', tag: 'Design', tagColor: 'bg-purple-100 text-purple-600' },
      { id: 2, title: 'Setup CI/CD', tag: 'DevOps', tagColor: 'bg-blue-100 text-blue-600' },
    ]},
    { id: 'doing', title: 'In Progress', color: 'bg-blue-500', tasks: [
      { id: 3, title: 'API integration', tag: 'Backend', tagColor: 'bg-green-100 text-green-600' },
    ]},
    { id: 'done', title: 'Done', color: 'bg-green-500', tasks: [
      { id: 4, title: 'Project setup', tag: 'Setup', tagColor: 'bg-gray-100 text-gray-600' },
    ]},
  ]);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTask, setNewTask] = useState('');

  const addTask = (colId: string) => {
    if (!newTask.trim()) return;
    setColumns(columns.map((c) => c.id === colId ? { ...c, tasks: [...c.tasks, { id: Date.now(), title: newTask, tag: 'General', tagColor: 'bg-gray-100 text-gray-600' }] } : c));
    setNewTask(''); setAddingTo(null);
  };

  const moveTask = (taskId: number, fromCol: string, toCol: string) => {
    if (fromCol === toCol) return;
    const task = columns.find((c) => c.id === fromCol)?.tasks.find((t) => t.id === taskId);
    if (!task) return;
    setColumns(columns.map((c) => {
      if (c.id === fromCol) return { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) };
      if (c.id === toCol) return { ...c, tasks: [...c.tasks, task] };
      return c;
    }));
  };

  return (
    <div className="flex h-full p-4 gap-3 overflow-x-auto">
      {columns.map((col) => (
        <div key={col.id} className="w-56 flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${col.color}`} />
              <span className="text-sm font-semibold">{col.title}</span>
              <span className="text-xs text-gray-500">{col.tasks.length}</span>
            </div>
            <button onClick={() => setAddingTo(col.id)} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"><Plus size={14} /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {col.tasks.map((task) => (
              <div key={task.id} className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1 mb-1">
                  <GripVertical size={12} className="text-gray-400" />
                  <span className={`text-xs px-1.5 py-0.5 rounded ${task.tagColor}`}>{task.tag}</span>
                </div>
                <span className="text-sm">{task.title}</span>
                <div className="flex gap-1 mt-2">
                  {columns.filter((c) => c.id !== col.id).map((c) => (
                    <button key={c.id} onClick={() => moveTask(task.id, col.id, c.id)} className="text-xs px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10">
                      → {c.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {addingTo === col.id && (
            <div className="mt-2">
              <input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask(col.id)} placeholder="Task name" className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm outline-none" autoFocus />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
