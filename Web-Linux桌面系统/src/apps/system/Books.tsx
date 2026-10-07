import { useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Type, Sun, Moon as MoonIcon } from 'lucide-react';

const sampleBook = `Chapter 1: The Beginning\n\nIt was a bright cold day in April, and the clocks were striking thirteen. Winston Smith, his chin nuzzled into his breast in an effort to escape the vile wind, slipped quickly through the glass doors of Victory Mansions, though not quickly enough to prevent a swirl of gritty dust from entering along with him.\n\nThe hallway smelt of boiled cabbage and old rag mats. At one end of it a coloured poster, too large for indoor display, had been tacked to the wall. It depicted simply an enormous face, more than a metre wide: the face of a man of about forty-five, with a heavy black moustache and ruggedly handsome features.\n\nWinston made for the stairs. It was no use trying the lift. Even at the best of times it was seldom working, and at present the electric current was cut off during daylight hours.`;

export default function Books() {
  const [page, setPage] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [dark, setDark] = useState(false);
  const totalPages = 24;

  return (
    <div className={`flex flex-col h-full ${dark ? 'bg-gray-900 text-gray-200' : 'bg-amber-50 text-gray-800'}`}>
      <div className="flex items-center justify-between p-3 border-b border-gray-200/30 dark:border-gray-700/30">
        <h2 className="text-sm font-semibold flex items-center gap-2"><BookOpen size={16} /> 1984</h2>
        <div className="flex gap-1">
          <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Type size={12} /></button>
          <button onClick={() => setDark(!dark)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">{dark ? <Sun size={12} /> : <MoonIcon size={12} />}</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <p style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }} className="whitespace-pre-wrap font-serif">{sampleBook}</p>
      </div>
      <div className="flex items-center justify-between p-3 border-t border-gray-200/30 dark:border-gray-700/30">
        <button onClick={() => setPage(Math.max(0, page - 1))} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" disabled={page === 0}><ChevronLeft size={16} /></button>
        <span className="text-xs">Page {page + 1} of {totalPages}</span>
        <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" disabled={page === totalPages - 1}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}
