import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

type Piece = { type: string; color: 'white' | 'black' } | null;

const initialBoard: Piece[][] = [
  [{type:'r',color:'black'},{type:'n',color:'black'},{type:'b',color:'black'},{type:'q',color:'black'},{type:'k',color:'black'},{type:'b',color:'black'},{type:'n',color:'black'},{type:'r',color:'black'}],
  Array(8).fill(null).map(() => ({type:'p',color:'black'})),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null).map(() => ({type:'p',color:'white'})),
  [{type:'r',color:'white'},{type:'n',color:'white'},{type:'b',color:'white'},{type:'q',color:'white'},{type:'k',color:'white'},{type:'b',color:'white'},{type:'n',color:'white'},{type:'r',color:'white'}],
];

const pieceSymbols: Record<string, string> = { k: '\u2654', q: '\u2655', r: '\u2656', b: '\u2657', n: '\u2658', p: '\u2659' };
const pieceSymbolsB: Record<string, string> = { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' };

export default function Chess() {
  const [board, setBoard] = useState<Piece[][]>(initialBoard.map(r => [...r]));
  const [selected, setSelected] = useState<{r:number,c:number} | null>(null);
  const [turn, setTurn] = useState<'white' | 'black'>('white');

  const handleClick = (r: number, c: number) => {
    if (selected) {
      const piece = board[selected.r][selected.c];
      if (piece && piece.color === turn) {
        const next = board.map(row => [...row]);
        next[r][c] = piece;
        next[selected.r][selected.c] = null;
        setBoard(next);
        setTurn(turn === 'white' ? 'black' : 'white');
      }
      setSelected(null);
    } else {
      if (board[r][c]) setSelected({r, c});
    }
  };

  const reset = () => { setBoard(initialBoard.map(r => [...r])); setTurn('white'); setSelected(null); };

  return (
    <div className="flex flex-col items-center h-full p-4">
      <div className="flex items-center justify-between w-full max-w-sm mb-2">
        <span className="text-sm font-medium">{turn === 'white' ? "White's turn" : "Black's turn"}</span>
        <button onClick={reset} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><RotateCcw size={14} /></button>
      </div>
      <div className="grid grid-cols-8 border-2 border-gray-800 rounded-lg overflow-hidden">
        {board.map((row, ri) => row.map((cell, ci) => {
          const isLight = (ri + ci) % 2 === 0;
          const isSelected = selected?.r === ri && selected?.c === ci;
          return (
            <button key={`${ri}-${ci}`} onClick={() => handleClick(ri, ci)}
              className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-2xl transition-all ${isLight ? 'bg-amber-100' : 'bg-amber-700'} ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''}`}>
              {cell && (cell.color === 'white' ? pieceSymbols[cell.type] : pieceSymbolsB[cell.type])}
            </button>
          );
        }))}
      </div>
    </div>
  );
}
