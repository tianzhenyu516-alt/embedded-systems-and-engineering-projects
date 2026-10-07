import { useState } from 'react';
import { Copy } from 'lucide-react';

export default function ColorPicker() {
  const [hue, setHue] = useState(200);
  const [sat, setSat] = useState(80);
  const [light, setLight] = useState(50);
  const [alpha, setAlpha] = useState(100);

  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const hex = hslToHex(hue, sat, light);
  const rgba = `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${alpha / 100})`;

  const shades = Array.from({ length: 9 }, (_, i) => hslToHex(hue, sat, 10 + i * 10));

  return (
    <div className="flex flex-col h-full p-4">
      <div className="w-full h-32 rounded-2xl shadow-lg mb-4 transition-colors" style={{ backgroundColor: rgba }} />
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs w-8">Hue</span>
          <input type="range" min="0" max="360" value={hue} onChange={(e) => setHue(Number(e.target.value))} className="flex-1 accent-blue-500" />
          <span className="text-xs w-8">{hue}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-8">Sat</span>
          <input type="range" min="0" max="100" value={sat} onChange={(e) => setSat(Number(e.target.value))} className="flex-1 accent-blue-500" />
          <span className="text-xs w-8">{sat}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-8">Lig</span>
          <input type="range" min="0" max="100" value={light} onChange={(e) => setLight(Number(e.target.value))} className="flex-1 accent-blue-500" />
          <span className="text-xs w-8">{light}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-8">Alp</span>
          <input type="range" min="0" max="100" value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} className="flex-1 accent-blue-500" />
          <span className="text-xs w-8">{alpha}%</span>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => navigator.clipboard?.writeText(hex)} className="flex-1 flex items-center justify-center gap-1 p-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm font-mono hover:bg-black/10">
          <Copy size={12} /> {hex}
        </button>
        <button onClick={() => navigator.clipboard?.writeText(rgba)} className="flex-1 flex items-center justify-center gap-1 p-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm font-mono hover:bg-black/10">
          <Copy size={12} /> {rgba}
        </button>
      </div>
      <div>
        <span className="text-xs text-gray-500 mb-1 block">Shades</span>
        <div className="grid grid-cols-9 gap-1">
          {shades.map((s, i) => (
            <button key={i} onClick={() => { const m = 10 + i * 10; setLight(m); }} className="aspect-square rounded-lg" style={{ backgroundColor: s }} />
          ))}
        </div>
      </div>
    </div>
  );
}
