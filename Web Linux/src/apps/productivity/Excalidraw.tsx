import { useState, useRef, useEffect } from 'react';
import { Pencil, Square, Circle, ArrowRight, Type, Trash2, Undo } from 'lucide-react';

type Tool = 'pencil' | 'rect' | 'circle' | 'arrow' | 'text';
type Element = { id: number; type: Tool; x: number; y: number; w?: number; h?: number; text?: string; color: string };

export default function Excalidraw() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [elements, setElements] = useState<Element[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const colors = ['#000000', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#9c36b5'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    elements.forEach((el) => {
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      if (el.type === 'rect' && el.w && el.h) {
        ctx.strokeRect(el.x, el.y, el.w, el.h);
      } else if (el.type === 'circle' && el.w) {
        ctx.beginPath();
        ctx.arc(el.x, el.y, Math.abs(el.w), 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === 'arrow' && el.w && el.h) {
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo((el.x || 0) + (el.w || 0), (el.y || 0) + (el.h || 0));
        ctx.stroke();
      } else if (el.type === 'text' && el.text) {
        ctx.font = '16px sans-serif';
        ctx.fillText(el.text, el.x, el.y);
      }
    });
  }, [elements]);

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    setStartPos(pos);
    if (tool === 'pencil') {
      setElements([...elements, { id: Date.now(), type: 'pencil', x: pos.x, y: pos.y, color }]);
    } else if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) setElements([...elements, { id: Date.now(), type: 'text', x: pos.x, y: pos.y, text, color }]);
      setIsDrawing(false);
    }
  };

  const endDraw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pos = getPos(e);
    if (tool === 'rect') {
      setElements([...elements, { id: Date.now(), type: 'rect', x: startPos.x, y: startPos.y, w: pos.x - startPos.x, h: pos.y - startPos.y, color }]);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      setElements([...elements, { id: Date.now(), type: 'circle', x: startPos.x, y: startPos.y, w: radius, color }]);
    } else if (tool === 'arrow') {
      setElements([...elements, { id: Date.now(), type: 'arrow', x: startPos.x, y: startPos.y, w: pos.x - startPos.x, h: pos.y - startPos.y, color }]);
    }
  };

  const tools: { id: Tool; icon: typeof Pencil }[] = [
    { id: 'pencil', icon: Pencil },
    { id: 'rect', icon: Square },
    { id: 'circle', icon: Circle },
    { id: 'arrow', icon: ArrowRight },
    { id: 'text', icon: Type },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        {tools.map((t) => (
          <button key={t.id} onClick={() => setTool(t.id)} className={`p-1.5 rounded ${tool === t.id ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
            <t.icon size={14} />
          </button>
        ))}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
        {colors.map((c) => (
          <button key={c} onClick={() => setColor(c)} className={`w-4 h-4 rounded-full border ${color === c ? 'border-gray-400 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={() => setElements(elements.slice(0, -1))} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><Undo size={14} /></button>
          <button onClick={() => setElements([])} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 size={14} /></button>
        </div>
      </div>
      <canvas ref={canvasRef} width={780} height={500} onMouseDown={startDraw} onMouseUp={endDraw} className="flex-1 w-full cursor-crosshair bg-white" />
    </div>
  );
}
