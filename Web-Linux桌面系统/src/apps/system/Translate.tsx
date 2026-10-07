import { useState } from 'react';
import { ArrowUpDown, Copy } from 'lucide-react';

const dictionary: Record<string, string> = {
  hello: '你好', world: '世界', computer: '电脑', apple: '苹果', book: '书',
  water: '水', sun: '太阳', moon: '月亮', star: '星星', love: '爱',
  friend: '朋友', family: '家庭', work: '工作', school: '学校', city: '城市',
  dog: '狗', cat: '猫', bird: '鸟', fish: '鱼', tree: '树',
  red: '红色', blue: '蓝色', green: '绿色', yellow: '黄色', black: '黑色',
  thanks: '谢谢', please: '请', sorry: '对不起', goodbye: '再见', welcome: '欢迎',
};

export default function Translate() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fromLang, setFromLang] = useState('English');
  const [toLang, setToLang] = useState('Chinese');
  const [recent, setRecent] = useState<string[]>(['hello', 'computer', 'apple']);

  const translate = () => {
    const words = from.toLowerCase().trim().split(/\s+/);
    const translated = words.map((w) => dictionary[w] || w).join(' ');
    setTo(translated);
    if (from.trim() && !recent.includes(from.trim())) setRecent([from.trim(), ...recent].slice(0, 10));
  };

  const swap = () => { setFromLang(toLang); setToLang(fromLang); setFrom(to); setTo(from); };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-center gap-4 mb-4">
        <select value={fromLang} onChange={(e) => setFromLang(e.target.value)} className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none">
          <option>English</option><option>Chinese</option><option>Spanish</option><option>French</option>
        </select>
        <button onClick={swap} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ArrowUpDown size={14} /></button>
        <select value={toLang} onChange={(e) => setToLang(e.target.value)} className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none">
          <option>Chinese</option><option>English</option><option>Spanish</option><option>French</option>
        </select>
      </div>
      <div className="flex-1 space-y-3">
        <div className="relative">
          <textarea value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Enter text..." className="w-full h-28 p-3 rounded-xl bg-black/5 dark:bg-white/5 text-sm resize-none outline-none" />
          <button onClick={translate} className="absolute bottom-2 right-2 px-4 py-1.5 rounded-full bg-blue-500 text-white text-xs hover:bg-blue-600">Translate</button>
        </div>
        <div className="relative">
          <textarea value={to} readOnly placeholder="Translation..." className="w-full h-28 p-3 rounded-xl bg-black/5 dark:bg-white/5 text-sm resize-none outline-none" />
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button onClick={() => navigator.clipboard?.writeText(to)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Copy size={12} /></button>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <span className="text-xs text-gray-500 mb-1 block">Recent</span>
        <div className="flex gap-1 flex-wrap">
          {recent.map((r) => (
            <button key={r} onClick={() => { setFrom(r); setTo(dictionary[r] || ''); }} className="px-2 py-0.5 rounded-full text-xs bg-black/5 dark:bg-white/5 hover:bg-black/10">{r}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
