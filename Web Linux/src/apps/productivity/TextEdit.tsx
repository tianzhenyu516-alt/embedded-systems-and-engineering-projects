import { useState } from 'react';
import { Bold, Italic, Underline, List } from 'lucide-react';

export default function TextEdit() {
  const [content, setContent] = useState('Welcome to TextEdit\n\nThis is a simple text editor with basic formatting support.\n\nYou can write, edit, and format your text here.');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        <button onClick={() => setBold(!bold)} className={`p-1.5 rounded ${bold ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}><Bold size={14} /></button>
        <button onClick={() => setItalic(!italic)} className={`p-1.5 rounded ${italic ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}><Italic size={14} /></button>
        <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><Underline size={14} /></button>
        <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><List size={14} /></button>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
        <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="text-xs bg-transparent outline-none">
          {[10, 12, 14, 16, 18, 20, 24].map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>
        <div className="ml-auto text-xs text-gray-500">{wordCount} words · {charCount} chars</div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className={`flex-1 p-4 resize-none outline-none text-sm leading-relaxed ${bold ? 'font-bold' : ''} ${italic ? 'italic' : ''}`}
        style={{ fontSize: `${fontSize}px` }}
        placeholder="Start typing..."
      />
    </div>
  );
}
