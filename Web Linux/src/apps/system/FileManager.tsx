import { useState } from 'react';
import { useOSStore } from '@/store/osStore';
import { Folder, FileText, ChevronRight, ArrowLeft, Search, Plus, Trash2 } from 'lucide-react';

export default function FileManager() {
  const { getNodeById, addNode, removeNode } = useOSStore();
  const [currentId, setCurrentId] = useState('desktop');
  const [view] = useState<'icon' | 'list'>('icon');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<string[]>(['desktop']);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newName, setNewName] = useState('');

  const current = getNodeById(currentId);
  if (!current) return <div>Loading...</div>;

  const children = (current.children || []).filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const navigate = (id: string) => {
    setHistory([...history, id]);
    setCurrentId(id);
  };

  const goBack = () => {
    if (history.length > 1) {
      const prev = history.slice(0, -1);
      setHistory(prev);
      setCurrentId(prev[prev.length - 1]);
    }
  };

  const createFolder = () => {
    if (!newName.trim()) return;
    addNode(currentId, {
      id: `fs_${Date.now()}`,
      name: newName,
      type: 'directory',
      children: [],
      parentId: currentId,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    });
    setNewName('');
    setShowNewFolder(false);
  };

  const path = [];
  let node = current;
  while (node) {
    path.unshift(node);
    const parent = node.parentId ? getNodeById(node.parentId) : null;
    node = parent || null as any;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        <button onClick={goBack} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><ArrowLeft size={14} /></button>
        <div className="flex items-center gap-1 text-xs">
          {path.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={10} className="text-gray-400" />}
              <button onClick={() => { setCurrentId(p.id); setHistory([...history.slice(0, history.indexOf(p.id) + 1)]); }} className="hover:underline">{p.name === '/' ? 'Home' : p.name}</button>
            </span>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1.5 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-6 pr-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-xs outline-none w-24" />
          </div>
          <button onClick={() => setShowNewFolder(true)} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><Plus size={14} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {view === 'icon' ? (
          <div className="grid grid-cols-4 gap-3">
            {children.map((child) => (
              <button key={child.id} onClick={() => child.type === 'directory' ? navigate(child.id) : null} onDoubleClick={() => child.type === 'directory' ? navigate(child.id) : null}
                className="flex flex-col items-center p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 group">
                {child.type === 'directory' ? <Folder size={40} className="text-blue-400 mb-1" /> : <FileText size={40} className="text-gray-400 mb-1" />}
                <span className="text-xs text-center truncate w-full">{child.name}</span>
                <button onClick={(e) => { e.stopPropagation(); removeNode(child.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-400 hover:bg-red-100">
                  <Trash2 size={10} />
                </button>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {children.map((child) => (
              <button key={child.id} onClick={() => child.type === 'directory' ? navigate(child.id) : null}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left">
                {child.type === 'directory' ? <Folder size={16} className="text-blue-400" /> : <FileText size={16} className="text-gray-400" />}
                <span className="text-sm flex-1">{child.name}</span>
                <span className="text-xs text-gray-500">{child.type === 'file' ? `${child.size || 0} B` : 'Folder'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {showNewFolder && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-72 shadow-2xl">
            <h3 className="text-sm font-semibold mb-3">New Folder</h3>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createFolder()} placeholder="Folder name" className="w-full p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none" autoFocus />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowNewFolder(false)} className="flex-1 p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm">Cancel</button>
              <button onClick={createFolder} className="flex-1 p-2 rounded-lg bg-blue-500 text-white text-sm">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
