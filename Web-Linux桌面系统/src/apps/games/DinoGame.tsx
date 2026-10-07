import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw } from 'lucide-react';

export default function DinoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const gameState = useRef({ dinoY: 100, dinoVel: 0, jumping: false, obstacles: [] as {x:number,h:number}[], frame: 0 });

  const GRAVITY = 0.6;
  const JUMP = -12;
  const GROUND = 140;

  const reset = () => {
    gameState.current = { dinoY: 100, dinoVel: 0, jumping: false, obstacles: [], frame: 0 };
    setScore(0);
    setGameOver(false);
    setStarted(true);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#535353';
    ctx.fillRect(0, GROUND, canvas.width, 2);
    const gs = gameState.current;
    ctx.fillStyle = '#535353';
    ctx.fillRect(20, gs.dinoY, 20, 24);
    ctx.fillStyle = '#535353';
    gs.obstacles.forEach(o => {
      ctx.fillRect(o.x, GROUND - o.h, 10, o.h);
    });
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      const gs = gameState.current;
      gs.frame++;
      if (gs.frame % 60 === 0) gs.obstacles.push({ x: 600, h: 20 + Math.random() * 20 });
      gs.obstacles = gs.obstacles.filter(o => o.x > -20).map(o => ({ ...o, x: o.x - 4 }));
      if (gs.jumping) {
        gs.dinoVel += GRAVITY;
        gs.dinoY += gs.dinoVel;
        if (gs.dinoY >= 100) { gs.dinoY = 100; gs.dinoVel = 0; gs.jumping = false; }
      }
      gs.obstacles.forEach(o => {
        if (o.x < 40 && o.x > 10 && gs.dinoY + 24 > GROUND - o.h) setGameOver(true);
      });
      setScore(Math.floor(gs.frame / 10));
      draw();
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [started, gameOver, draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!started || gameOver) { reset(); return; }
        const gs = gameState.current;
        if (!gs.jumping) { gs.jumping = true; gs.dinoVel = JUMP; }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [started, gameOver]);

  useEffect(() => { if (!started) draw(); }, [draw, started]);

  return (
    <div className="flex flex-col items-center h-full p-4">
      <div className="flex items-center justify-between w-full max-w-md mb-2">
        <span className="text-sm font-medium">Score: {score}</span>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={600} height={180} className="rounded-xl shadow-lg border border-gray-200" />
        {(gameOver || !started) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-xl">
            <span className="text-xl font-bold mb-2">{gameOver ? 'Game Over!' : 'Dino Run'}</span>
            <button onClick={reset} className="px-4 py-2 rounded-full bg-gray-800 text-white text-sm flex items-center gap-1">
              {gameOver ? <><RotateCcw size={14} /> Restart</> : <><Play size={14} /> Start</>}
            </button>
            <p className="text-xs mt-2">Press Space to jump</p>
          </div>
        )}
      </div>
    </div>
  );
}
