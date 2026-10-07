import { useState } from 'react';
import { HardDrive, ExternalLink, Plus } from 'lucide-react';

const volumes = [
  { id: 1, name: 'Web Desktop', mount: '/', size: 500, used: 320, type: 'APFS', color: 'bg-blue-500' },
  { id: 2, name: 'Data', mount: '/Data', size: 1000, used: 450, type: 'APFS', color: 'bg-green-500' },
  { id: 3, name: 'Backup', mount: '/Volumes/Backup', size: 2000, used: 1200, type: 'ExFAT', color: 'bg-purple-500' },
  { id: 4, name: 'External USB', mount: '/Volumes/USB', size: 128, used: 45, type: 'FAT32', color: 'bg-amber-500' },
];

export default function DiskUtility() {
  const [selected, setSelected] = useState(1);
  const vol = volumes.find((v) => v.id === selected);

  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-gray-200/30 dark:border-gray-700/30 p-3">
        <div className="space-y-1">
          {volumes.map((v) => (
            <button key={v.id} onClick={() => setSelected(v.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${selected === v.id ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <HardDrive size={14} />
              {v.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4">
        {vol && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                <HardDrive size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{vol.name}</h2>
                <p className="text-xs text-gray-500">{vol.mount} · {vol.type}</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5">
              <div className="flex justify-between text-sm mb-2">
                <span>{vol.used} GB used</span>
                <span>{vol.size - vol.used} GB free</span>
              </div>
              <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full ${vol.color} rounded-full transition-all`} style={{ width: `${(vol.used / vol.size) * 100}%` }} />
              </div>
              <div className="text-center text-xs text-gray-500 mt-1">{vol.size} GB total</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm hover:bg-black/10">
                <Plus size={14} /> First Aid
              </button>
              <button className="flex items-center justify-center gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm hover:bg-black/10">
                <ExternalLink size={14} /> Mount
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
