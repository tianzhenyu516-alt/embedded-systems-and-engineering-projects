import { useState } from 'react';
import { Dices } from 'lucide-react';

const diceFaces = ['\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'];

export default function Dice() {
  const [count, setCount] = useState(2);
  const [results, setResults] = useState<number[]>([3, 5]);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    setRolling(true);
    const interval = setInterval(() => {
      setResults(Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1));
    }, 50);
    setTimeout(() => {
      clearInterval(interval);
      setRolling(false);
    }, 800);
  };

  const total = results.reduce((s, r) => s + r, 0);

  return (
    <div className="flex flex-col items-center h-full p-4">
      <Dices size={32} className="text-gray-400 mb-3" />
      <h2 className="text-lg font-semibold mb-4">Dice Roller</h2>
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button key={n} onClick={() => { setCount(n); setResults(Array(n).fill(1)); }} className={`w-8 h-8 rounded-full text-sm ${count === n ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex gap-3 mb-4">
        {results.map((r, i) => (
          <div key={i} className={`w-16 h-16 rounded-xl bg-white dark:bg-gray-800 shadow-md flex items-center justify-center text-4xl ${rolling ? 'animate-bounce' : ''}`}>
            {diceFaces[r - 1]}
          </div>
        ))}
      </div>
      <div className="text-sm text-gray-500 mb-4">Total: <span className="font-bold text-lg">{total}</span></div>
      <button onClick={roll} disabled={rolling} className="px-6 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
        {rolling ? 'Rolling...' : 'Roll'}
      </button>
    </div>
  );
}
