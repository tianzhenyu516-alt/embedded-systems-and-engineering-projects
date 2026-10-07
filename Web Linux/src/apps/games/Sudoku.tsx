import { useState } from 'react';
import { RotateCcw, Check } from 'lucide-react';

const SOLUTION = [
  [5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],
  [8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],
  [9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9],
];

const INITIAL = SOLUTION.map(r => r.map(c => Math.random() > 0.5 ? c : 0));

export default function Sudoku() {
  const [grid, setGrid] = useState(INITIAL.map(r => [...r]));
  const [selected, setSelected] = useState({ r: 0, c: 0 });
  const [solved, setSolved] = useState(false);

  const handleClick = (r: number, c: number) => setSelected({ r, c });

  const setNumber = (n: number) => {
    if (INITIAL[selected.r][selected.c] !== 0) return;
    const next = grid.map(r => [...r]);
    next[selected.r][selected.c] = n;
    setGrid(next);
  };

  const check = () => {
    const isSolved = grid.every((r, ri) => r.every((c, ci) => c === SOLUTION[ri][ci]));
    setSolved(isSolved);
  };

  const reset = () => { setGrid(INITIAL.map(r => [...r])); setSolved(false); };

  return (
    <div className="flex flex-col items-center h-full p-4">
      <div className="flex items-center justify-between w-full max-w-xs mb-2">
        <span className="text-sm font-medium">{solved ? 'Solved!' : 'Sudoku'}</span>
        <div className="flex gap-1">
          <button onClick={check} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><Check size={14} /></button>
          <button onClick={reset} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><RotateCcw size={14} /></button>
        </div>
      </div>
      <div className="grid grid-cols-9 gap-px bg-gray-400 rounded-lg overflow-hidden mb-3">
        {grid.map((row, ri) => row.map((cell, ci) => (
          <button key={`${ri}-${ci}`} onClick={() => handleClick(ri, ci)}
            className={`w-8 h-8 flex items-center justify-center text-sm font-medium ${
              selected.r === ri && selected.c === ci ? 'bg-blue-200 dark:bg-blue-800' : 'bg-white dark:bg-gray-800'
            } ${(ri + 1) % 3 === 0 && ri !== 8 ? 'border-b-2 border-gray-400' : ''} ${(ci + 1) % 3 === 0 && ci !== 8 ? 'border-r-2 border-gray-400' : ''} ${INITIAL[ri][ci] !== 0 ? 'font-bold' : 'text-blue-600'}`}>
            {cell || ''}
          </button>
        )))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => setNumber(n)} className="w-10 h-10 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">{n}</button>
        ))}
        <button onClick={() => setNumber(0)} className="w-10 h-10 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">C</button>
      </div>
    </div>
  );
}
