import { useState, useEffect, useRef } from 'react';
import { Download, Upload, Zap, RotateCw } from 'lucide-react';

export default function Speedtest() {
  const [phase, setPhase] = useState<'idle' | 'download' | 'upload' | 'done'>('idle');
  const [downloadSpeed, setDownloadSpeed] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);
  const [ping, setPing] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const animRef = useRef<number | null>(null);

  const start = () => {
    setPhase('download');
    setProgress(0);
    setDownloadSpeed(0);
    setUploadSpeed(0);
    setPing(Math.floor(Math.random() * 20) + 5);

    let p = 0;
    const animate = () => {
      p += 0.5;
      setProgress(p);
      if (p < 50) {
        setDownloadSpeed(Math.min(950, Math.floor(Math.random() * 100) + 50 + p * 15) as number);
        animRef.current = requestAnimationFrame(animate);
      } else if (p < 100) {
        setPhase('upload');
        setUploadSpeed(Math.min(500, Math.floor(Math.random() * 60) + 20 + (p - 50) * 8) as number);
        animRef.current = requestAnimationFrame(animate);
      } else {
        setPhase('done');
        setDownloadSpeed(850);
        setUploadSpeed(420);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const gaugeValue = phase === 'download' ? downloadSpeed : phase === 'upload' ? uploadSpeed : 0;
  const maxVal = 1000;
  const rotation = -90 + (Math.min(gaugeValue, maxVal) / maxVal) * 180;

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="relative w-48 h-24 mb-6">
        <div className="absolute inset-0 rounded-t-full border-[12px] border-gray-200 dark:border-gray-700" />
        <div className="absolute inset-0 rounded-t-full border-[12px] border-transparent border-t-blue-500 transition-transform duration-300 origin-bottom" style={{ transform: `rotate(${rotation}deg)` }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          {phase !== 'idle' && phase !== 'done' ? (
            <>
              <div className="text-3xl font-bold">{gaugeValue}</div>
              <div className="text-xs text-gray-500">Mbps</div>
            </>
          ) : phase === 'done' ? (
            <>
              <div className="text-3xl font-bold">{downloadSpeed}</div>
              <div className="text-xs text-gray-500">Mbps</div>
            </>
          ) : (
            <div className="text-lg text-gray-400">Ready</div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full mb-6">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1"><Download size={12} /> Download</div>
          <div className="text-xl font-bold">{downloadSpeed || '--'}</div>
          <div className="text-xs text-gray-500">Mbps</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1"><Upload size={12} /> Upload</div>
          <div className="text-xl font-bold">{uploadSpeed || '--'}</div>
          <div className="text-xs text-gray-500">Mbps</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1"><Zap size={12} /> Ping</div>
          <div className="text-xl font-bold">{ping || '--'}</div>
          <div className="text-xs text-gray-500">ms</div>
        </div>
      </div>
      {phase === 'idle' || phase === 'done' ? (
        <button onClick={start} className="px-8 py-3 rounded-full bg-blue-500 text-white font-medium hover:bg-blue-600 flex items-center gap-2">
          {phase === 'done' ? <><RotateCw size={16} /> Test Again</> : 'Start Test'}
        </button>
      ) : (
        <div className="w-full max-w-xs">
          <div className="text-center text-xs text-gray-500 mb-2">{phase === 'download' ? 'Testing download...' : 'Testing upload...'}</div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
