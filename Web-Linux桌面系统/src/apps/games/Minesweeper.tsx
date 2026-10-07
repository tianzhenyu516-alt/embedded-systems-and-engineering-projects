import { useState, useCallback } from 'react';
import { RotateCcw, Flag } from 'lucide-react';

const ROWS = 9;
const COLS = 9;
const MINES = 10;

function createBoard() {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill({ mine: false, revealed: false, flagged: false, adjacent: 0 }));
  let mines = 0;
  while (mines < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!board[r][c].mine) { board[r][c] = { ...board[r][c], mine: true }; mines++; }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) count++;
      }
      board[r][c] = { ...board[r][c], adjacent: count };
    }
  }
  return board;
}

export default function Minesweeper() {
  const [board, setBoard] = useState(() => createBoard());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const reveal = useCallback((r: number, c: number, b: typeof board) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c].revealed || b[r][c].flagged) return;
    b[r][c] = { ...b[r][c], revealed: true };
    if (b[r][c].adjacent === 0 && !b[r][c].mine) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) reveal(r + dr, c + dc, b);
    }
  }, []);

  const handleClick = (r: number, c: number) => {
    if (gameOver || won || board[r][c].flagged) return;
    const next = board.map(row => row.map(cell => ({ ...cell })));
    if (next[r][c].mine) {
      next.forEach(row => row.forEach(c => { if (c.mine) c.revealed = true; }));
      setBoard(next);
      setGameOver(true);
      return;
    }
    reveal(r, c, next);
    setBoard(next);
    const unrevealed = next.flat().filter(c => !c.revealed && !c.mine).length;
    if (unrevealed === 0) setWon(true);
  };

  const handleRightClick = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameOver || won || board[r][c].revealed) return;
    const next = board.map(row => row.map(cell => ({ ...cell })));
    next[r][c] = { ...next[r][c], flagged: !next[r][c].flagged };
    setBoard(next);
  };

  const reset = () => { setBoard(createBoard()); setGameOver(false); setWon(false); };

  return (
    <div className="flex flex-col items-center h-full p-4">
      <div className="flex items-center justify-between w-full max-w-xs mb-2">
        <span className="text-sm font-medium">{gameOver ? 'Game Over!' : won ? 'You Win!' : 'Minesweeper'}</span>
        <button onClick={reset} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><RotateCcw size={14} /></button>
      </div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {board.map((row, ri) => row.map((cell, ci) => (
          <button key={`${ri}-${ci}`} onClick={() => handleClick(ri, ci)} onContextMenu={(e) => handleRightClick(e, ri, ci)}
            className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all ${
              cell.revealed ? (cell.mine ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700') : 'bg-blue-500 hover:bg-blue-400'
            }`}>
            {cell.revealed ? (cell.mine ? '\uD83D\uDCA3' : cell.adjacent || '') : cell.flagged ? <Flag size={12} className="text-red-300" /> : ''}
          </button>
        )))}
      </div>
    </div>
  );
}
