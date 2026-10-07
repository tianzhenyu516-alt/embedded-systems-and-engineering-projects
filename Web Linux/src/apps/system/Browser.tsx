import { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Globe } from 'lucide-react';

export default function Browser() {
  const [url, setUrl] = useState('https://example.com');
  const [input, setInput] = useState('https://example.com');

  const navigate = () => {
    let u = input.trim();
    if (!u.startsWith('http')) u = 'https://' + u;
    setUrl(u);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        <button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><ArrowLeft size={14} /></button>
        <button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><ArrowRight size={14} /></button>
        <button onClick={() => setUrl(url + '?r=' + Date.now())} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><RotateCw size={14} /></button>
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5">
          <Globe size={12} className="text-gray-500" />
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && navigate()} className="flex-1 bg-transparent outline-none text-xs" />
        </div>
        <button onClick={navigate} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Home size={14} /></button>
      </div>
      <div className="flex-1 bg-white">
        <iframe src={url} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-forms" title="Browser" />
      </div>
    </div>
  );
}
