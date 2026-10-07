import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const getColor = (v: number) => {
  const colors: Record<number, string> = {
    0: 'bg-gray-200 dark:bg-gray-700', 2: 'bg-gray-100 text-gray-800', 4: 'bg-amber-100 text-gray-800',
    8: 'bg-orange-300 text-white', 16: 'bg-orange-400 text-white', 32: 'bg-red-400 text-white',
    64: 'bg-red-500 text-white', 128: 'bg-amber-300 text-white', 256: 'bg-amber-400 text-white',
    512: 'bg-amber-500 text-white', 1024: 'bg-yellow-400 text-white', 2048: 'bg-yellow-500 text-white',
  };
  return colors[v] || 'bg-purple-500 text-white';
};

function addRandom(board: number[][]): number[][] {
  const empty: [number,number][] = [];
  board.forEach((r, ri) => r.forEach((c, ci) => { if (c === 0) empty.push([ri, ci]); }));
  if (empty.length === 0) return board;
  const [ri, ci] = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map(r => [...r]);
  next[ri][ci] = Math.random() > 0.9 ? 4 : 2;
  return next;
}

function slide(row: number[]): number[] {
  const filtered = row.filter(v => v !== 0);
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) { filtered[i] *= 2; filtered[i + 1] = 0; }
  }
  const result = filtered.filter(v => v !== 0);
  while (result.length < 4) result.push(0);
  return result;
}

export default function Game2048() {
  const [board, setBoard] = useState(() => addRandom(addRandom(Array(4).fill(null).map(() => Array(4).fill(0)))));
  const [score, setScore] = useState(0);

  const move = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    setBoard(prev => {
      let next = prev.map(r => [...r]);
      if (dir === 'left') next = next.map(r => slide(r));
      else if (dir === 'right') next = next.map(r => slide([...r].reverse()).reverse());
      else if (dir === 'up') {
        for (let c = 0; c < 4; c++) {
          const col = slide([next[0][c], next[1][c], next[2][c], next[3][c]]);
          for (let r = 0; r < 4; r++) next[r][c] = col[r];
        }
      } else if (dir === 'down') {
        for (let c = 0; c < 4; c++) {
          const col = slide([next[3][c], next[2][c], next[1][c], next[0][c]]).reverse();
          for (let r = 0; r < 4; r++) next[r][c] = col[r];
        }
      }
      const changed = JSON.stringify(prev) !== JSON.stringify(next);
      if (changed) {
        setScore(s => s + next.flat().reduce((a, b) => a + b, 0) - prev.flat().reduce((a, b) => a + b, 0));
        return addRandom(next);
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': move('up'); break;
        case 'ArrowDown': move('down'); break;
        case 'ArrowLeft': move('left'); break;
        case 'ArrowRight': move('right'); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move]);

  const reset = () => { setBoard(addRandom(addRandom(Array(4).fill(null).map(() => Array(4).fill(0))))); setScore(0); };

  return (
    <div className="flex flex-col items-center h-full p-4">
      <div className="flex items-center justify-between w-full max-w-xs mb-2">
        <span className="text-sm font-medium">Score: {score}</span>
        <button onClick={reset} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><RotateCcw size={14} /></button>
      </div>
      <div className="grid grid-cols-4 gap-1 p-2 bg-gray-300 dark:bg-gray-800 rounded-xl mb-3">
        {board.flat().map((v, i) => (
          <div key={i} className={`w-16 h-16 rounded-lg flex items-center justify-center text-xl font-bold ${getColor(v)}`}>
            {v || ''}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1 w-32">
        <div />
        <button onClick={() => move('up')} className="p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10"><ArrowUp size={14} /></button>
        <div />
        <button onClick={() => move('left')} className="p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10"><ArrowLeft size={14} /></button>
        <button onClick={() => move('down')} className="p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10"><ArrowDown size={14} /></button>
        <button onClick={() => move('right')} className="p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10"><ArrowRight size={14} /></button>
      </div>
    </div>
  );
}
