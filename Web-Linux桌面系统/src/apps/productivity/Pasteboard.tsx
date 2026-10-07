import { useOSStore } from '@/store/osStore';
import { Clipboard, Copy, Clock } from 'lucide-react';

export default function Pasteboard() {
  const { clipboardHistory, copy } = useOSStore();

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clipboard size={18} className="text-blue-500" />
        <h2 className="text-lg font-semibold">Clipboard History</h2>
        <span className="ml-auto text-xs text-gray-500">{clipboardHistory.length} items</span>
      </div>
      {clipboardHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Clock size={32} className="mb-2 opacity-30" />
          <span className="text-sm">No clipboard history yet</span>
          <span className="text-xs">Copy something to see it here</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1">
          {clipboardHistory.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 group">
              <span className="text-xs text-gray-500 w-6">{i + 1}</span>
              <span className="flex-1 text-sm truncate font-mono">{item.length > 50 ? item.slice(0, 50) + '...' : item}</span>
              <button onClick={() => copy(item)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5">
                <Copy size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
