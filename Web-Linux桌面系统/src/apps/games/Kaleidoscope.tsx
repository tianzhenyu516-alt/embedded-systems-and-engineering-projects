import { useRef, useEffect } from 'react';

export default function Kaleidoscope() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const segments = 8;

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener('mousemove', handleMove);

    let frame: number;
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, w, h);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const dx = mx - cx;
      const dy = my - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hue = (Date.now() * 0.05 + dist * 0.5) % 360;

      for (let i = 0; i < segments; i++) {
        const angle = (Math.PI * 2 / segments) * i;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.arc(Math.abs(dx) * 0.5, Math.abs(dy) * 0.3, 3 + Math.sin(Date.now() * 0.003 + i) * 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue + i * 30}, 80%, 60%, 0.6)`;
        ctx.fill();
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); canvas.removeEventListener('mousemove', handleMove); };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <canvas ref={canvasRef} width={600} height={560} className="w-full h-full bg-black rounded-xl" />
      <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/50">Move your mouse to create patterns</p>
    </div>
  );
}
