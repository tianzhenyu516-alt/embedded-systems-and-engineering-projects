import { useState } from 'react';
import { Sparkles } from 'lucide-react';

const cards = [
  { id: 0, name: 'The Fool', meaning: 'New beginnings, innocence, spontaneity', image: '\uD83C\uDF00' },
  { id: 1, name: 'The Magician', meaning: 'Manifestation, resourcefulness, power', image: '\u2728' },
  { id: 2, name: 'The High Priestess', meaning: 'Intuition, sacred knowledge, divinity', image: '\uD83D\uDD2E' },
  { id: 3, name: 'The Empress', meaning: 'Femininity, beauty, nature, abundance', image: '\uD83C\uDF31' },
  { id: 4, name: 'The Emperor', meaning: 'Authority, structure, control, fatherhood', image: '\uD83D\uDC51' },
  { id: 5, name: 'The Hierophant', meaning: 'Spiritual wisdom, religious beliefs', image: '\uD83D\uDCD6' },
  { id: 6, name: 'The Lovers', meaning: 'Love, harmony, relationships, choices', image: '\u2764\uFE0F' },
  { id: 7, name: 'The Chariot', meaning: 'Control, willpower, success, action', image: '\uD83D\uDE97' },
  { id: 8, name: 'Strength', meaning: 'Strength, courage, persuasion, influence', image: '\uD83D\uDCAA' },
  { id: 9, name: 'The Hermit', meaning: 'Soul searching, introspection, guidance', image: '\uD83D\uDD26' },
  { id: 10, name: 'Wheel of Fortune', meaning: 'Good luck, karma, life cycles, destiny', image: '\uD83C\uDFB0' },
  { id: 11, name: 'Justice', meaning: 'Justice, fairness, truth, law', image: 'u2696\uFE0F' },
];

export default function Tarot() {
  const [drawn, setDrawn] = useState<typeof cards[0][]>([]);
  const [shuffling, setShuffling] = useState(false);

  const shuffle = () => {
    setShuffling(true);
    setTimeout(() => {
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      setDrawn(shuffled.slice(0, 3));
      setShuffling(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles size={18} className="text-purple-500" /> Tarot Reading</h2>
        <button onClick={shuffle} disabled={shuffling} className="px-4 py-1.5 rounded-full bg-purple-500 text-white text-sm hover:bg-purple-600 disabled:opacity-50">
          {shuffling ? 'Shuffling...' : 'Shuffle'}
        </button>
      </div>
      {drawn.length > 0 ? (
        <div className="space-y-3">
          {['Past', 'Present', 'Future'].map((pos, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <div className="w-12 h-20 rounded-lg bg-gradient-to-b from-purple-600 to-indigo-800 flex items-center justify-center text-2xl shadow-md">
                {drawn[i]?.image}
              </div>
              <div>
                <div className="text-xs text-purple-500 font-medium">{pos}</div>
                <div className="text-sm font-medium">{drawn[i]?.name}</div>
                <div className="text-xs text-gray-500">{drawn[i]?.meaning}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <div className="text-6xl mb-3">\uD83C\uDCCF</div>
          <p className="text-sm">Shuffle the deck to reveal your reading</p>
        </div>
      )}
    </div>
  );
}
