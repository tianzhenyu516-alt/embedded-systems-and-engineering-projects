import { useState } from 'react';
import { Search, Inbox, Send, Star, Trash2, Archive, MailOpen } from 'lucide-react';

const emails = [
  { id: 1, from: 'Alice Johnson', subject: 'Project Update', preview: 'Hey, just wanted to share the latest updates on our project...', date: '10:30 AM', read: false, starred: true, folder: 'inbox' },
  { id: 2, from: 'Bob Smith', subject: 'Meeting Tomorrow', preview: 'Can we reschedule our meeting to 2 PM instead?', date: '9:15 AM', read: true, starred: false, folder: 'inbox' },
  { id: 3, from: 'Carol White', subject: 'Invoice #1234', preview: 'Please find attached the invoice for last month...', date: 'Yesterday', read: true, starred: false, folder: 'inbox' },
  { id: 4, from: 'David Lee', subject: 'Happy Birthday!', preview: 'Wishing you a wonderful birthday filled with joy!', date: 'Yesterday', read: false, starred: true, folder: 'inbox' },
  { id: 5, from: 'Eve Brown', subject: 'Newsletter', preview: 'Check out our latest products and offers this week...', date: 'Mon', read: true, starred: false, folder: 'inbox' },
  { id: 6, from: 'Frank Miller', subject: 'Job Application', preview: 'Thank you for your interest in the position...', date: 'Sun', read: true, starred: false, folder: 'sent' },
];

export default function Mail() {
  const [selected, setSelected] = useState(1);
  const [folder, setFolder] = useState('inbox');
  const [search, setSearch] = useState('');
  const [emailList, setEmailList] = useState(emails);

  const folders = [
    { id: 'inbox', icon: Inbox, label: 'Inbox', count: emails.filter((e) => e.folder === 'inbox' && !e.read).length },
    { id: 'sent', icon: Send, label: 'Sent', count: 0 },
    { id: 'starred', icon: Star, label: 'Starred', count: 0 },
    { id: 'trash', icon: Trash2, label: 'Trash', count: 0 },
  ];

  const filtered = emailList.filter((e) => {
    if (folder === 'starred') return e.starred;
    if (folder === 'trash') return e.folder === 'trash';
    return e.folder === folder;
  }).filter((e) => e.subject.toLowerCase().includes(search.toLowerCase()) || e.from.toLowerCase().includes(search.toLowerCase()));

  const selectedEmail = emailList.find((e) => e.id === selected);

  const toggleStar = (id: number) => setEmailList(emailList.map((e) => e.id === id ? { ...e, starred: !e.starred } : e));

  return (
    <div className="flex h-full">
      <div className="w-40 border-r border-gray-200/30 dark:border-gray-700/30 p-3">
        <div className="space-y-1">
          {folders.map((f) => (
            <button key={f.id} onClick={() => setFolder(f.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${folder === f.id ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <f.icon size={14} />
              <span className="flex-1 text-left">{f.label}</span>
              {f.count > 0 && <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{f.count}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="w-56 border-r border-gray-200/30 dark:border-gray-700/30 flex flex-col">
        <div className="p-3">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((e) => (
            <button key={e.id} onClick={() => { setSelected(e.id); setEmailList(emailList.map((em) => em.id === e.id ? { ...em, read: true } : em)); }} className={`w-full text-left px-3 py-2 transition-all ${selected === e.id ? 'bg-blue-500 text-white' : e.read ? '' : 'bg-blue-50 dark:bg-blue-900/20 font-semibold'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm truncate flex-1">{e.from}</span>
                <span className="text-xs opacity-50">{e.date}</span>
              </div>
              <div className="text-sm truncate">{e.subject}</div>
              <div className="text-xs opacity-60 truncate">{e.preview}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4">
        {selectedEmail ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{selectedEmail.subject}</h2>
              <div className="flex gap-1">
                <button onClick={() => toggleStar(selectedEmail.id)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Star size={14} className={selectedEmail.starred ? 'text-amber-400' : ''} /></button>
                <button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Archive size={14} /></button>
                <button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">{selectedEmail.from.charAt(0)}</div>
              <div><div className="text-sm font-medium">{selectedEmail.from}</div><div className="text-xs text-gray-500">{selectedEmail.date}</div></div>
            </div>
            <p className="text-sm leading-relaxed">{selectedEmail.preview}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500"><MailOpen size={48} className="mb-2 opacity-30" /><span className="text-sm">Select an email</span></div>
        )}
      </div>
    </div>
  );
}
