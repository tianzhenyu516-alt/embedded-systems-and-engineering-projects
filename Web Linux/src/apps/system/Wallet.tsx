import { useState } from 'react';
import { CreditCard, Plus } from 'lucide-react';

const cards = [
  { id: 1, name: 'Visa Platinum', number: '**** **** **** 4521', balance: 4523.50, color: 'from-blue-600 to-blue-800' },
  { id: 2, name: 'Mastercard Gold', number: '**** **** **** 8892', balance: 12340.00, color: 'from-amber-500 to-amber-700' },
];

const transactions = [
  { id: 1, name: 'Apple Store', amount: -1299.00, date: 'Today', icon: 'A' },
  { id: 2, name: 'Starbucks', amount: -6.50, date: 'Today', icon: 'S' },
  { id: 3, name: 'Salary', amount: 5200.00, date: 'Yesterday', icon: 'W' },
  { id: 4, name: 'Netflix', amount: -15.99, date: 'Yesterday', icon: 'N' },
  { id: 5, name: 'Uber', amount: -24.30, date: 'Mon', icon: 'U' },
];

export default function Wallet() {
  const [selectedCard, setSelectedCard] = useState(0);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Wallet</h2>
        <button className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><Plus size={16} /></button>
      </div>
      <div className="space-y-3 mb-4">
        {cards.map((card, i) => (
          <button key={card.id} onClick={() => setSelectedCard(i)} className={`w-full p-4 rounded-2xl bg-gradient-to-r ${card.color} text-white shadow-lg text-left transition-transform hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-4">
              <CreditCard size={24} />
              <span className="text-xs opacity-70">{card.name}</span>
            </div>
            <div className="text-lg font-mono tracking-wider mb-2">{card.number}</div>
            <div className="flex justify-between items-end">
              <span className="text-xs opacity-70">Balance</span>
              <span className="text-xl font-bold">${card.balance.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
            </div>
          </button>
        ))}
      </div>
      <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase">Recent Transactions</h3>
      <div className="flex-1 overflow-y-auto space-y-1">
        {transactions.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
            <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-xs font-bold">{t.icon}</div>
            <div className="flex-1">
              <div className="text-sm">{t.name}</div>
              <div className="text-xs text-gray-500">{t.date}</div>
            </div>
            <span className={`text-sm font-medium ${t.amount > 0 ? 'text-green-500' : ''}`}>
              {t.amount > 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
