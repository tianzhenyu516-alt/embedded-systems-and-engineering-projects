import { useState } from 'react';
import { History } from 'lucide-react';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState('');
  const [op, setOp] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [scientific, setScientific] = useState(false);

  const handleNum = (num: string) => {
    if (display === '0' || display === 'Error') setDisplay(num);
    else if (display.length < 16) setDisplay(display + num);
  };

  const handleOp = (operation: string) => {
    setPrev(display);
    setOp(operation);
    setDisplay('0');
  };

  const calculate = () => {
    if (!op || !prev) return;
    const a = parseFloat(prev);
    const b = parseFloat(display);
    let result = 0;
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = b === 0 ? NaN : a / b; break;
      case '%': result = a % b; break;
      case '^': result = Math.pow(a, b); break;
    }
    const res = isNaN(result) ? 'Error' : String(Number(result.toFixed(10)));
    setHistory((h) => [`${prev} ${op} ${display} = ${res}`, ...h].slice(0, 20));
    setDisplay(res);
    setOp('');
    setPrev('');
  };

  const clear = () => { setDisplay('0'); setPrev(''); setOp(''); };
  const negate = () => setDisplay((d) => String(parseFloat(d) * -1));
  const percent = () => setDisplay((d) => String(parseFloat(d) / 100));
  const sci = (fn: (n: number) => number) => setDisplay((d) => {
    const r = fn(parseFloat(d));
    return isNaN(r) ? 'Error' : String(Number(r.toFixed(10)));
  });

  const btnClass = (variant: string) => {
    switch (variant) {
      case 'op': return 'bg-amber-500 text-white hover:bg-amber-600';
      case 'eq': return 'bg-blue-500 text-white hover:bg-blue-600';
      case 'func': return 'bg-gray-300 dark:bg-gray-700 text-black dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600';
      default: return 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3">
        <button onClick={() => setScientific(!scientific)} className="text-xs text-gray-400 hover:text-white">{scientific ? 'Standard' : 'Scientific'}</button>
        <button onClick={() => setShowHistory(!showHistory)} className="text-gray-400 hover:text-white"><History size={16} /></button>
      </div>
      <div className="flex-1 flex flex-col justify-end px-4 pb-2">
        {op && <div className="text-right text-gray-500 text-sm">{prev} {op}</div>}
        <div className="text-right text-4xl font-light truncate">{display}</div>
      </div>
      {showHistory && (
        <div className="max-h-24 overflow-y-auto px-4 text-xs text-gray-400 border-t border-gray-700">
          {history.map((h, i) => <div key={i} className="py-0.5">{h}</div>)}
        </div>
      )}
      <div className="grid gap-1 p-2">
        {scientific ? (
          <>
            <div className="grid grid-cols-5 gap-1">
              {['sin', 'cos', 'tan', 'ln', 'log'].map((f) => (
                <button key={f} onClick={() => {
                  if (f === 'sin') sci(Math.sin);
                  else if (f === 'cos') sci(Math.cos);
                  else if (f === 'tan') sci(Math.tan);
                  else if (f === 'ln') sci(Math.log);
                  else if (f === 'log') sci(Math.log10);
                }} className={`p-2.5 rounded-lg text-xs font-medium ${btnClass('func')}`}>{f}</button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {['sqrt', 'x^2', 'x^y', 'pi', 'e'].map((f) => (
                <button key={f} onClick={() => {
                  if (f === 'sqrt') sci(Math.sqrt);
                  else if (f === 'x^2') setDisplay((d) => String(Math.pow(parseFloat(d), 2)));
                  else if (f === 'x^y') handleOp('^');
                  else if (f === 'pi') setDisplay(String(Math.PI));
                  else if (f === 'e') setDisplay(String(Math.E));
                }} className={`p-2.5 rounded-lg text-xs font-medium ${btnClass('func')}`}>{f}</button>
              ))}
            </div>
          </>
        ) : null}
        <div className="grid grid-cols-4 gap-1">
          <button onClick={clear} className={`p-3 rounded-lg text-sm font-medium ${btnClass('func')}`}>AC</button>
          <button onClick={negate} className={`p-3 rounded-lg text-sm font-medium ${btnClass('func')}`}>+/-</button>
          <button onClick={percent} className={`p-3 rounded-lg text-sm font-medium ${btnClass('func')}`}>%</button>
          <button onClick={() => handleOp('/')} className={`p-3 rounded-lg text-sm font-medium ${btnClass('op')}`}>/</button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {['7', '8', '9'].map((n) => <button key={n} onClick={() => handleNum(n)} className={`p-3 rounded-lg text-lg font-medium ${btnClass('num')}`}>{n}</button>)}
          <button onClick={() => handleOp('*')} className={`p-3 rounded-lg text-sm font-medium ${btnClass('op')}`}>x</button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {['4', '5', '6'].map((n) => <button key={n} onClick={() => handleNum(n)} className={`p-3 rounded-lg text-lg font-medium ${btnClass('num')}`}>{n}</button>)}
          <button onClick={() => handleOp('-')} className={`p-3 rounded-lg text-sm font-medium ${btnClass('op')}`}>-</button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {['1', '2', '3'].map((n) => <button key={n} onClick={() => handleNum(n)} className={`p-3 rounded-lg text-lg font-medium ${btnClass('num')}`}>{n}</button>)}
          <button onClick={() => handleOp('+')} className={`p-3 rounded-lg text-sm font-medium ${btnClass('op')}`}>+</button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <button onClick={() => handleNum('0')} className={`col-span-2 p-3 rounded-lg text-lg font-medium ${btnClass('num')}`}>0</button>
          <button onClick={() => handleNum('.')} className={`p-3 rounded-lg text-lg font-medium ${btnClass('num')}`}>.</button>
          <button onClick={calculate} className={`p-3 rounded-lg text-sm font-medium ${btnClass('eq')}`}>=</button>
        </div>
      </div>
    </div>
  );
}
