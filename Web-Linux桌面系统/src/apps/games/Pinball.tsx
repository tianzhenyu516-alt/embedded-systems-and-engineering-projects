import { useState, useEffect, useRef, useCallback } from 'react';

const W = 400;
const H = 600;

export default function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const state = useRef({ ball: { x: 200, y: 400, vx: 3, vy: -4 }, paddle: 180 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(state.current.ball.x, state.current.ball.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3498db';
    ctx.fillRect(state.current.paddle, H - 20, 80, 10);
    ctx.fillStyle = '#f39c12';
    [[100, 100], [300, 150], [200, 250], [150, 350], [300, 300]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      const s = state.current;
      s.ball.x += s.ball.vx;
      s.ball.y += s.ball.vy;
      s.ball.vy += 0.15;
      if (s.ball.x < 8 || s.ball.x > W - 8) s.ball.vx *= -1;
      if (s.ball.y < 8) s.ball.vy *= -1;
      if (s.ball.y > H - 8) { setGameOver(true); return; }
      if (s.ball.y > H - 30 && s.ball.x > s.paddle && s.ball.x < s.paddle + 80) {
        s.ball.vy = -Math.abs(s.ball.vy) - 1;
        setScore(sc => sc + 10);
      }
      draw();
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [started, gameOver, draw]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      state.current.paddle = Math.max(0, Math.min(W - 80, e.clientX - rect.left - 40));
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const reset = () => {
    state.current = { ball: { x: 200, y: 400, vx: 3, vy: -4 }, paddle: 180 };
    setScore(0);
    setGameOver(false);
    setStarted(true);
  };

  useEffect(() => { if (!started) draw(); }, [draw, started]);

  return (
    <div className="flex flex-col items-center h-full p-2">
      <span className="text-sm font-medium mb-1">Score: {score}</span>
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="rounded-xl shadow-lg" />
        {(gameOver || !started) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl">
            <span className="text-white text-xl font-bold mb-2">{gameOver ? `Score: ${score}` : 'Pinball'}</span>
            <button onClick={reset} className="px-4 py-2 rounded-full bg-blue-500 text-white text-sm">
              'Start'
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
