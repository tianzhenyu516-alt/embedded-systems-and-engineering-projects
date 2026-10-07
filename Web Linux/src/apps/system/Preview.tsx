import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Image, FileText } from 'lucide-react';

export default function Preview() {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [mode, setMode] = useState<'image' | 'text'>('image');

  const sampleText = `This is a preview document.\n\nYou can view images and text files in this preview app.\n\nFeatures:\n- Zoom in/out\n- Rotate\n- Full screen mode`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="flex gap-1">
          <button onClick={() => setMode('image')} className={`p-1.5 rounded-lg ${mode === 'image' ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}><Image size={14} /></button>
          <button onClick={() => setMode('text')} className={`p-1.5 rounded-lg ${mode === 'text' ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}><FileText size={14} /></button>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><ZoomOut size={14} /></button>
          <span className="text-xs self-center px-2">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><ZoomIn size={14} /></button>
          <button onClick={() => setRotation(r => r + 90)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><RotateCw size={14} /></button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 overflow-auto p-4">
        {mode === 'image' ? (
          <div className="w-64 h-48 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg transition-transform" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}>
            <Image size={48} className="text-white/50" />
          </div>
        ) : (
          <div className="max-w-lg bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg" style={{ transform: `scale(${zoom})` }}>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{sampleText}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
