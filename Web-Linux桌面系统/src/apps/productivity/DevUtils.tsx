import { useState } from 'react';
import { Code, Hash, Clock, FileJson } from 'lucide-react';

const tools = [
  { id: 'json', label: 'JSON Format', icon: FileJson },
  { id: 'base64', label: 'Base64', icon: Code },
  { id: 'timestamp', label: 'Timestamp', icon: Clock },
  { id: 'hash', label: 'Hash', icon: Hash },
  { id: 'regex', label: 'Regex', icon: Code },
  { id: 'diff', label: 'Diff', icon: Code },
];

export default function DevUtils() {
  const [active, setActive] = useState('json');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const process = () => {
    switch (active) {
      case 'json':
        try { setOutput(JSON.stringify(JSON.parse(input), null, 2)); } catch { setOutput('Invalid JSON'); }
        break;
      case 'base64':
        try { setOutput(btoa(input)); } catch { setOutput('Invalid input'); }
        break;
      case 'timestamp':
        try { const d = new Date(Number(input) || input); setOutput(d.toString()); } catch { setOutput('Invalid timestamp'); }
        break;
      case 'hash':
        { let h = 0; for (let i = 0; i < input.length; i++) { h = ((h << 5) - h) + input.charCodeAt(i); h |= 0; } setOutput(Math.abs(h).toString(16)); }
        break;
      case 'regex':
        try { const r = new RegExp(input); setOutput('Valid regex: ' + r.toString()); } catch { setOutput('Invalid regex'); }
        break;
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-36 border-r border-gray-200/30 dark:border-gray-700/30 p-2">
        {tools.map((t) => (
          <button key={t.id} onClick={() => { setActive(t.id); setInput(''); setOutput(''); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${active === t.id ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Input..." className="flex-1 p-3 rounded-xl bg-black/5 dark:bg-white/5 text-sm resize-none outline-none font-mono" />
        <button onClick={process} className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm hover:bg-blue-600">Process</button>
        <textarea value={output} readOnly placeholder="Output..." className="flex-1 p-3 rounded-xl bg-black/5 dark:bg-white/5 text-sm resize-none outline-none font-mono" />
      </div>
    </div>
  );
}
