import { useState } from 'react';
import { Search, Plus, Trash2, Bold, Italic, List, Underline } from 'lucide-react';

const initialNotes = [
  { id: 1, title: 'Shopping List', content: '- Milk\n- Eggs\n- Bread\n- Coffee\n- Apples', folder: 'Personal', date: '2024-01-15' },
  { id: 2, title: 'Meeting Notes', content: ' discussed Q1 roadmap\n- Launch new feature by March\n- Hire 2 engineers\n- Budget review next week', folder: 'Work', date: '2024-01-14' },
  { id: 3, title: 'Book Ideas', content: '1. A story about time travel\n2. Mystery in a small town\n3. AI romance novel\n4. Cooking memoir', folder: 'Ideas', date: '2024-01-13' },
  { id: 4, title: 'Workout Plan', content: 'Mon: Chest\nTue: Back\nWed: Legs\nThu: Shoulders\nFri: Arms\nSat: Cardio\nSun: Rest', folder: 'Personal', date: '2024-01-12' },
];

export default function Notes() {
  const [notes, setNotes] = useState(initialNotes);
  const [selected, setSelected] = useState(1);
  const [search, setSearch] = useState('');
  const [_view, _setView] = useState<'list' | 'grid'>('list');
  const [folder, setFolder] = useState('All');
  const folders = ['All', 'Personal', 'Work', 'Ideas'];

  const filtered = notes.filter((n) => {
    const matchFolder = folder === 'All' || n.folder === folder;
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    return matchFolder && matchSearch;
  });

  const selectedNote = notes.find((n) => n.id === selected);

  const updateNote = (content: string) => {
    setNotes(notes.map((n) => n.id === selected ? { ...n, content } : n));
  };

  const addNote = () => {
    const newNote = { id: Date.now(), title: 'New Note', content: '', folder: 'Personal', date: new Date().toISOString().split('T')[0] };
    setNotes([newNote, ...notes]);
    setSelected(newNote.id);
  };

  const deleteNote = (id: number) => {
    setNotes(notes.filter((n) => n.id !== id));
    if (selected === id) setSelected(notes[0]?.id || 0);
  };

  return (
    <div className="flex h-full">
      <div className="w-56 border-r border-gray-200/30 dark:border-gray-700/30 flex flex-col">
        <div className="p-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2 top-2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs outline-none" />
          </div>
          <button onClick={addNote} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Plus size={16} /></button>
        </div>
        <div className="flex gap-1 px-3 pb-2">
          {folders.map((f) => (
            <button key={f} onClick={() => setFolder(f)} className={`px-2 py-0.5 rounded-full text-xs ${folder === f ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}>{f}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((n) => (
            <button key={n.id} onClick={() => setSelected(n.id)} className={`w-full text-left px-3 py-2 transition-all ${selected === n.id ? 'bg-amber-200/50 dark:bg-amber-800/30' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <div className="text-sm font-medium truncate">{n.title}</div>
              <div className="text-xs text-gray-500 truncate">{n.content.slice(0, 40) || 'No content'}</div>
              <div className="text-xs text-gray-400 mt-0.5">{n.date}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            <div className="flex items-center gap-2 p-2 border-b border-gray-200/30 dark:border-gray-700/30">
              <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><Bold size={14} /></button>
              <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><Italic size={14} /></button>
              <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><Underline size={14} /></button>
              <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><List size={14} /></button>
              <button onClick={() => deleteNote(selectedNote.id)} className="ml-auto p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 size={14} /></button>
            </div>
            <input
              value={selectedNote.title}
              onChange={(e) => setNotes(notes.map((n) => n.id === selected ? { ...n, title: e.target.value } : n))}
              className="px-4 py-2 text-lg font-semibold bg-transparent outline-none"
            />
            <textarea
              value={selectedNote.content}
              onChange={(e) => updateNote(e.target.value)}
              className="flex-1 px-4 py-2 text-sm bg-transparent outline-none resize-none leading-relaxed"
              placeholder="Start typing..."
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">Select a note</div>
        )}
      </div>
    </div>
  );
}
