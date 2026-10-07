import { useState } from 'react';
import { Plus, ZoomIn, ZoomOut } from 'lucide-react';

interface Node {
  id: number;
  text: string;
  x: number;
  y: number;
  children: number[];
}

export default function MindNode() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 0, text: 'Central Idea', x: 350, y: 200, children: [1, 2, 3] },
    { id: 1, text: 'Branch A', x: 200, y: 100, children: [4] },
    { id: 2, text: 'Branch B', x: 500, y: 100, children: [] },
    { id: 3, text: 'Branch C', x: 350, y: 350, children: [5] },
    { id: 4, text: 'Sub A1', x: 100, y: 50, children: [] },
    { id: 5, text: 'Sub C1', x: 250, y: 400, children: [] },
  ]);
  const [selected, setSelected] = useState(0);
  const [zoom, setZoom] = useState(1);

  const addChild = () => {
    const parent = nodes.find((n) => n.id === selected);
    if (!parent) return;
    const newId = Math.max(...nodes.map((n) => n.id)) + 1;
    const angle = Math.random() * Math.PI * 2;
    const dist = 100;
    const newNode: Node = {
      id: newId,
      text: 'New Node',
      x: parent.x + Math.cos(angle) * dist,
      y: parent.y + Math.sin(angle) * dist,
      children: [],
    };
    setNodes([...nodes.map((n) => n.id === selected ? { ...n, children: [...n.children, newId] } : n), newNode]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        <button onClick={addChild} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><Plus size={14} /></button>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><ZoomIn size={14} /></button>
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><ZoomOut size={14} /></button>
        <input
          value={nodes.find((n) => n.id === selected)?.text || ''}
          onChange={(e) => setNodes(nodes.map((n) => n.id === selected ? { ...n, text: e.target.value } : n))}
          className="flex-1 px-3 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none"
        />
      </div>
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 relative">
        <svg className="w-full h-full" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
          {nodes.map((node) => {
            const parent = nodes.find((n) => n.children.includes(node.id));
            if (parent) {
              return (
                <line key={`line-${node.id}`} x1={parent.x} y1={parent.y} x2={node.x} y2={node.y}
                  stroke="#94a3b8" strokeWidth="2" />
              );
            }
            return null;
          })}
          {nodes.map((node) => (
            <g key={node.id} onClick={() => setSelected(node.id)} className="cursor-pointer">
              <circle cx={node.x} cy={node.y} r={node.id === 0 ? 40 : 30}
                fill={selected === node.id ? '#3b82f6' : '#e2e8f0'}
                stroke={selected === node.id ? '#2563eb' : '#94a3b8'} strokeWidth="2" />
              <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle"
                fill={selected === node.id ? '#fff' : '#334155'} fontSize="12">
                {node.text.length > 10 ? node.text.slice(0, 8) + '...' : node.text}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
