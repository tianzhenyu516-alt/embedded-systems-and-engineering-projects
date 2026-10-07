import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export default function Numbers() {
  const [cells, setCells] = useState<(string | number)[][]>(
    Array.from({ length: 10 }, (_, r) =>
      Array.from({ length: 6 }, (_, c) => r === 0 ? ['Name', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'][c] : '')
    )
  );
  const [selected, setSelected] = useState({ row: 0, col: 0 });

  const updateCell = (row: number, col: number, value: string) => {
    const next = cells.map((r) => [...r]);
    next[row][col] = value;
    if (col >= 1 && col <= 4 && row > 0) {
      const sum = [1, 2, 3, 4].reduce((s, c) => s + (parseFloat(next[row][c] as string) || 0), 0);
      next[row][5] = sum;
    }
    setCells(next);
  };

  const chartData = cells.slice(1, 5).map((r) => parseFloat(r[5] as string) || 0);
  const maxVal = Math.max(...chartData, 1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><Plus size={14} /></button>
        <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><Minus size={14} /></button>
        <span className="text-xs text-gray-500 ml-2">Spreadsheet</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <tbody>
            {cells.map((row, ri) => (
              <tr key={ri}>
                <td className="w-8 text-center text-xs text-gray-500 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">{ri}</td>
                {row.map((cell, ci) => (
                  <td key={ci} className={`border border-gray-200 dark:border-gray-700 ${ri === 0 ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''} ${selected.row === ri && selected.col === ci ? 'ring-2 ring-blue-500' : ''}`}>
                    <input
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      onFocus={() => setSelected({ row: ri, col: ci })}
                      className="w-full px-2 py-1 outline-none bg-transparent text-right"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4">
          <div className="flex items-end gap-2 h-32">
            {chartData.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs">{v}</span>
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(v / maxVal) * 100}px` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
