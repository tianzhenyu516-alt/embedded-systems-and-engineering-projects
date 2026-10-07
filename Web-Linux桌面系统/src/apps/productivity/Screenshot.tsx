import { useState } from 'react';
import { Camera, Monitor, Square, Check } from 'lucide-react';

export default function Screenshot() {
  const [mode, setMode] = useState<'full' | 'area'>('full');
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);

  const capture = () => {
    setCapturing(true);
    setTimeout(() => { setCapturing(false); setCaptured(true); }, 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      {captured ? (
        <div className="text-center">
          <div className="w-64 h-48 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl shadow-lg flex items-center justify-center mb-4 mx-auto">
            <Check size={48} className="text-white" />
          </div>
          <p className="text-sm font-medium mb-1">Screenshot saved!</p>
          <p className="text-xs text-gray-500 mb-3">Saved to Desktop</p>
          <button onClick={() => setCaptured(false)} className="px-4 py-2 rounded-full bg-blue-500 text-white text-sm hover:bg-blue-600">Take Another</button>
        </div>
      ) : (
        <>
          <Camera size={48} className="text-gray-400 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Screenshot</h2>
          <p className="text-sm text-gray-500 mb-4 text-center">Capture your screen or a selected area</p>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setMode('full')} className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 ${mode === 'full' ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}>
              <Monitor size={14} /> Full Screen
            </button>
            <button onClick={() => setMode('area')} className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 ${mode === 'area' ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}>
              <Square size={14} /> Selected Area
            </button>
          </div>
          <button onClick={capture} disabled={capturing} className="px-6 py-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
            {capturing ? 'Capturing...' : 'Capture'}
          </button>
        </>
      )}
    </div>
  );
}
