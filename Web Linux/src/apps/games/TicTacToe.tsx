import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

export default function TicTacToe() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);

  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

  const check = (b: (string | null)[]) => {
    for (const [a, c, d] of lines) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    return null;
  };

  const handleClick = (i: number) => {
    if (board[i] || winner) return;
    const next = [...board];
    next[i] = xTurn ? 'X' : 'O';
    setBoard(next);
    const w = check(next);
    if (w) setWinner(w);
    else if (!next.includes(null)) setWinner('draw');
    setXTurn(!xTurn);
  };

  const reset = () => { setBoard(Array(9).fill(null)); setWinner(null); setXTurn(true); };

  return (
    <div className="flex flex-col items-center h-full p-4">
      <div className="flex items-center justify-between w-full max-w-xs mb-4">
        <span className="text-sm font-medium">{winner ? (winner === 'draw' ? 'Draw!' : `${winner} wins!`) : `${xTurn ? 'X' : 'O'}'s turn`}</span>
        <button onClick={reset} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><RotateCcw size={14} /></button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {board.map((cell, i) => (
          <button key={i} onClick={() => handleClick(i)} className="w-20 h-20 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-3xl font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all">
            {cell && <span className={cell === 'X' ? 'text-blue-500' : 'text-red-500'}>{cell}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
