import { useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export default function Pages() {
  const [content, setContent] = useState('Welcome to Pages\n\nThis is a simple word processor.\n\nYou can write documents, add formatting, and export your work.');
  const [fontSize, setFontSize] = useState(14);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="text-xs bg-transparent outline-none">
          {[10, 12, 14, 16, 18, 20, 24, 32].map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>
        <button onClick={() => setAlign('left')} className={`p-1.5 rounded ${align === 'left' ? 'bg-blue-500 text-white' : ''}`}><AlignLeft size={14} /></button>
        <button onClick={() => setAlign('center')} className={`p-1.5 rounded ${align === 'center' ? 'bg-blue-500 text-white' : ''}`}><AlignCenter size={14} /></button>
        <button onClick={() => setAlign('right')} className={`p-1.5 rounded ${align === 'right' ? 'bg-blue-500 text-white' : ''}`}><AlignRight size={14} /></button>
      </div>
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 min-h-[600px]">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full min-h-[500px] resize-none outline-none bg-transparent"
            style={{ fontSize: `${fontSize}px`, textAlign: align, lineHeight: '1.8' }}
          />
        </div>
      </div>
    </div>
  );
}
