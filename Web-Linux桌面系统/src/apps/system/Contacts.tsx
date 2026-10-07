import { useState } from 'react';
import { Search, Plus, Phone, Mail, Star, Trash2, UserCircle } from 'lucide-react';

const initialContacts = [
  { id: 1, name: 'Alice Johnson', phone: '+1 234 567 8901', email: 'contact@example.invalid', favorite: true, group: 'Friends' },
  { id: 2, name: 'Bob Smith', phone: '+1 234 567 8902', email: 'contact@example.invalid', favorite: false, group: 'Work' },
  { id: 3, name: 'Carol White', phone: '+1 234 567 8903', email: 'contact@example.invalid', favorite: true, group: 'Family' },
  { id: 4, name: 'David Lee', phone: '+1 234 567 8904', email: 'contact@example.invalid', favorite: false, group: 'Work' },
  { id: 5, name: 'Emma Brown', phone: '+1 234 567 8905', email: 'contact@example.invalid', favorite: false, group: 'Friends' },
  { id: 6, name: 'Frank Miller', phone: '+1 234 567 8906', email: 'contact@example.invalid', favorite: false, group: 'Work' },
  { id: 7, name: 'Grace Davis', phone: '+1 234 567 8907', email: 'contact@example.invalid', favorite: true, group: 'Family' },
];

export default function Contacts() {
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [group, setGroup] = useState('All');
  const groups = ['All', 'Favorites', 'Friends', 'Work', 'Family'];

  const filtered = contacts.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchGroup = group === 'All' ? true : group === 'Favorites' ? c.favorite : c.group === group;
    return matchSearch && matchGroup;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const toggleFav = (id: number) => {
    setContacts(contacts.map((c) => c.id === id ? { ...c, favorite: !c.favorite } : c));
  };

  const remove = (id: number) => {
    setContacts(contacts.filter((c) => c.id !== id));
    if (selected === id) setSelected(null);
  };

  const addContact = () => {
    if (!newName.trim()) return;
    setContacts([...contacts, { id: Date.now(), name: newName, phone: newPhone, email: newEmail, favorite: false, group: 'Friends' }]);
    setNewName(''); setNewPhone(''); setNewEmail(''); setShowAdd(false);
  };

  const selectedContact = contacts.find((c) => c.id === selected);

  return (
    <div className="flex h-full">
      <div className="w-56 border-r border-gray-200/30 dark:border-gray-700/30 flex flex-col">
        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts" className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
        </div>
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto">
          {groups.map((g) => (
            <button key={g} onClick={() => setGroup(g)} className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${group === g ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}>{g}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)} className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-all ${selected === c.id ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <UserCircle size={18} />
              <span className="flex-1 truncate">{c.name}</span>
              {c.favorite && <Star size={12} className="text-amber-400" />}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center justify-center gap-2 p-3 text-sm text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
          <Plus size={16} /> Add Contact
        </button>
      </div>
      <div className="flex-1 p-6">
        {selectedContact ? (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {selectedContact.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{selectedContact.name}</h3>
                <span className="text-xs text-gray-500">{selectedContact.group}</span>
              </div>
              <div className="ml-auto flex gap-2">
                <button onClick={() => toggleFav(selectedContact.id)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                  <Star size={18} className={selectedContact.favorite ? 'text-amber-400' : 'text-gray-400'} />
                </button>
                <button onClick={() => remove(selectedContact.id)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                  <Trash2 size={18} className="text-red-400" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <Phone size={16} className="text-green-500" />
                <span className="text-sm">{selectedContact.phone}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <Mail size={16} className="text-blue-500" />
                <span className="text-sm">{selectedContact.email}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <UserCircle size={48} className="mb-2 opacity-30" />
            <span className="text-sm">Select a contact</span>
          </div>
        )}
      </div>
      {showAdd && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">New Contact</h3>
            <div className="space-y-3">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="w-full p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none" />
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone" className="w-full p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none" />
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="w-full p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm">Cancel</button>
              <button onClick={addContact} className="flex-1 p-2 rounded-lg bg-blue-500 text-white text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
