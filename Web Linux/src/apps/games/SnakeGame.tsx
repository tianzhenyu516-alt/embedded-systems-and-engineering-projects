import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw } from 'lucide-react';

const GRID = 20;
const CELL = 20;

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [started, setStarted] = useState<boolean>(false);
  const snakeRef = useRef([{ x: 10, y: 10 }]);
  const foodRef = useRef({ x: 15, y: 15 });
  const dirRef = useRef({ x: 1, y: 0 });
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = () => {
    snakeRef.current = [{ x: 10, y: 10 }];
    foodRef.current = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    dirRef.current = { x: 1, y: 0 };
    setScore(0);
    setGameOver(false);
    setStarted(true);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const snake = snakeRef.current;
    const food = foodRef.current;

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#22c55e' : '#16a34a';
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
      ctx.fill();
    });
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    gameLoopRef.current = setInterval(() => {
      const snake = snakeRef.current;
      const dir = dirRef.current;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || snake.some((s) => s.x === head.x && s.y === head.y)) {
        setGameOver(true);
        return;
      }

      snake.unshift(head);
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore((s: number) => s + 10);
        foodRef.current = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
      } else {
        snake.pop();
      }
      draw();
    }, 150);
    return () => clearInterval(gameLoopRef.current);
  }, [started, gameOver, draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (dirRef.current.y === 0) dirRef.current = { x: 0, y: -1 }; break;
        case 'ArrowDown': if (dirRef.current.y === 0) dirRef.current = { x: 0, y: 1 }; break;
        case 'ArrowLeft': if (dirRef.current.x === 0) dirRef.current = { x: -1, y: 0 }; break;
        case 'ArrowRight': if (dirRef.current.x === 0) dirRef.current = { x: 1, y: 0 }; break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => { if (!started) draw(); }, [draw, started]);

  return (
    <div className="flex flex-col items-center h-full p-4">
      <div className="flex items-center justify-between w-full max-w-sm mb-2">
        <span className="text-sm font-medium">Score: {score}</span>
        <button onClick={reset} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><RotateCcw size={14} /></button>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} className="rounded-xl shadow-lg" />
        {(gameOver || !started) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl">
            <span className="text-white text-xl font-bold mb-2">{gameOver ? `Game Over: ${score}` : 'Snake'}</span>
            <button onClick={reset} className="px-4 py-2 rounded-full bg-green-500 text-white text-sm hover:bg-green-600 flex items-center gap-1">
              <Play size={14} /> {gameOver ? 'Restart' : 'Start'}
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2">Use arrow keys to move</p>
    </div>
  );
}
