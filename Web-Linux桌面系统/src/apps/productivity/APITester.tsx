import { useState } from 'react';
import { Send, Globe } from 'lucide-react';

export default function APITester() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://api.github.com/users/github');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    try {
      const res = await fetch(url, { method, headers: { 'Accept': 'application/json' } });
      const data = await res.text();
      setResponse(`Status: ${res.status} ${res.statusText}\n\n${data}`);
    } catch (e: any) {
      setResponse(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex gap-2 mb-3">
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm outline-none">
          {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5">
          <Globe size={12} className="text-gray-500" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <button onClick={send} disabled={loading} className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1">
          <Send size={12} /> {loading ? '...' : 'Send'}
        </button>
      </div>
      <div className="flex-1 flex gap-3">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Request body (JSON)" className="w-1/2 p-3 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-mono resize-none outline-none" />
        <textarea value={response} readOnly placeholder="Response will appear here..." className="w-1/2 p-3 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-mono resize-none outline-none" />
      </div>
    </div>
  );
}
