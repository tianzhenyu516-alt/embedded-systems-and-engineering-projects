import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

const slides = [
  { id: 1, title: 'Welcome', content: 'Web Desktop Presentation', subtitle: 'A new way to present', bg: 'from-blue-500 to-purple-600' },
  { id: 2, title: 'Features', content: '\u2022 Beautiful design\n\u2022 Easy to use\n\u2022 Powerful tools', subtitle: '', bg: 'from-green-500 to-teal-600' },
  { id: 3, title: 'Thank You', content: 'Questions?', subtitle: 'contact@example.invalid', bg: 'from-orange-500 to-red-600' },
];

export default function Keynote() {
  const [current, setCurrent] = useState(0);
  const [presenting, setPresenting] = useState(false);

  const slide = slides[current];

  if (presenting) {
    return (
      <div className={`absolute inset-0 z-50 bg-gradient-to-br ${slide.bg} flex flex-col items-center justify-center text-white`} onClick={() => setPresenting(false)}>
        <h1 className="text-5xl font-bold mb-4">{slide.title}</h1>
        <p className="text-xl whitespace-pre-line">{slide.content}</p>
        {slide.subtitle && <p className="text-lg mt-4 opacity-70">{slide.subtitle}</p>}
        <p className="absolute bottom-4 text-sm opacity-50">Click to exit</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        <span className="text-sm font-medium">Slide {current + 1} of {slides.length}</span>
        <button onClick={() => setPresenting(true)} className="px-3 py-1.5 rounded-full bg-blue-500 text-white text-xs flex items-center gap-1 hover:bg-blue-600">
          <Play size={12} /> Present
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className={`w-full max-w-lg aspect-video rounded-2xl bg-gradient-to-br ${slide.bg} flex flex-col items-center justify-center text-white shadow-lg p-8`}>
          <h2 className="text-2xl font-bold mb-3">{slide.title}</h2>
          <p className="text-center whitespace-pre-line">{slide.content}</p>
          {slide.subtitle && <p className="text-sm mt-3 opacity-70">{slide.subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 p-3 border-t border-gray-200/30 dark:border-gray-700/30">
        <button onClick={() => setCurrent(Math.max(0, current - 1))} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeft size={16} /></button>
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full ${i === current ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
          ))}
        </div>
        <button onClick={() => setCurrent(Math.min(slides.length - 1, current + 1))} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}
