import { useState } from 'react';

interface Card {
  id: number;
  suit: string;
  value: number;
  faceUp: boolean;
  color: 'red' | 'black';
}

const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;
  SUITS.forEach((suit) => {
    for (let v = 1; v <= 13; v++) {
      deck.push({ id: id++, suit, value: v, faceUp: false, color: (suit === '\u2665' || suit === '\u2666') ? 'red' : 'black' });
    }
  });
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}

export default function Solitaire() {
  const [deck] = useState(createDeck);
  const [waste, setWaste] = useState<Card[]>([]);
  const [foundations] = useState<Card[][]>([[], [], [], []]);
  const [tableau] = useState<Card[][]>(() => {
    const t: Card[][] = [[], [], [], [], [], [], []];
    let idx = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        t[col].push({ ...deck[idx++], faceUp: row === col });
      }
    }
    return t;
  });

  const draw = () => {
    if (idx < deck.length) {
      setWaste([...waste, { ...deck[idx], faceUp: true }]);
      idx++;
    }
  };

  let idx = waste.length;

  return (
    <div className="flex flex-col h-full p-2 bg-green-800">
      <div className="flex justify-between mb-2">
        <div className="flex gap-2">
          <button onClick={draw} className="w-12 h-16 rounded-lg bg-green-700 border border-green-600 flex items-center justify-center hover:bg-green-600">
            <span className="text-white text-xs">Draw</span>
          </button>
          <div className="w-12 h-16 rounded-lg bg-green-700 border border-green-600 flex items-center justify-center">
            {waste.length > 0 && <span className={`text-xl ${waste[waste.length-1].color === 'red' ? 'text-red-400' : 'text-white'}`}>{VALUES[waste[waste.length-1].value-1]}{waste[waste.length-1].suit}</span>}
          </div>
        </div>
        <div className="flex gap-1">
          {foundations.map((_f, i) => (
            <div key={i} className="w-12 h-16 rounded-lg bg-green-700 border border-green-600 flex items-center justify-center">
              <span className="text-green-500 text-lg">{SUITS[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex gap-1 justify-center">
        {tableau.map((col) => (
          <div key={col[0]?.id || Math.random()} className="w-12 flex flex-col gap-[-30px]">
            {col.map((card, ri) => (
              <div key={card.id} className={`w-12 h-16 rounded-lg border flex items-center justify-center text-xs -mt-8 first:mt-0 ${card.faceUp ? 'bg-white border-gray-300' : 'bg-blue-600 border-blue-500'}`}>
                {card.faceUp && <span className={`text-sm ${card.color === 'red' ? 'text-red-500' : 'text-black'}`}>{VALUES[card.value-1]}{card.suit}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
