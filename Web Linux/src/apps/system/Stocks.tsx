import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const stocks = [
  { id: 1, symbol: 'AAPL', name: 'Apple Inc.', price: 187.45, change: 2.34, changePct: 1.26, liked: true },
  { id: 2, symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.78, change: -1.23, changePct: -0.85, liked: true },
  { id: 3, symbol: 'MSFT', name: 'Microsoft', price: 378.91, change: 5.67, changePct: 1.52, liked: false },
  { id: 4, symbol: 'AMZN', name: 'Amazon', price: 178.23, change: 3.45, changePct: 1.98, liked: false },
  { id: 5, symbol: 'TSLA', name: 'Tesla', price: 238.56, change: -8.90, changePct: -3.60, liked: true },
  { id: 6, symbol: 'NVDA', name: 'NVIDIA', price: 495.12, change: 12.34, changePct: 2.56, liked: false },
];

const sparkline = (positive: boolean) => {
  const points = Array.from({ length: 20 }, (_, i) => {
    const base = positive ? 20 : 30;
    const variance = positive ? Math.sin(i * 0.5) * 10 + i * 0.5 : Math.cos(i * 0.5) * 10 - i * 0.3;
    return `${i * 5},${base - variance}`;
  }).join(' ');
  return points;
};

export default function Stocks() {
  const [watchlist] = useState(stocks);
  const [selected, setSelected] = useState(1);

  const selectedStock = watchlist.find((s) => s.id === selected);

  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-gray-200/30 dark:border-gray-700/30">
        <div className="p-3 space-y-1">
          {watchlist.map((s) => (
            <button key={s.id} onClick={() => setSelected(s.id)} className={`w-full text-left px-3 py-2 rounded-lg transition-all ${selected === s.id ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{s.symbol}</span>
                <span className={`text-xs ${s.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.change >= 0 ? '+' : ''}{s.changePct.toFixed(2)}%</span>
              </div>
              <div className="text-xs opacity-60">${s.price.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4">
        {selectedStock && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedStock.symbol}</h2>
                <p className="text-xs text-gray-500">{selectedStock.name}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">${selectedStock.price.toFixed(2)}</div>
                <div className={`text-sm flex items-center gap-1 ${selectedStock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {selectedStock.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)} ({selectedStock.change >= 0 ? '+' : ''}{selectedStock.changePct.toFixed(2)}%)
                </div>
              </div>
            </div>
            <svg viewBox="0 0 100 50" className="w-full h-40">
              <polyline fill="none" stroke={selectedStock.change >= 0 ? '#34C759' : '#FF3B30'} strokeWidth="1.5" points={sparkline(selectedStock.change >= 0)} />
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={selectedStock.change >= 0 ? '#34C759' : '#FF3B30'} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={selectedStock.change >= 0 ? '#34C759' : '#FF3B30'} stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
