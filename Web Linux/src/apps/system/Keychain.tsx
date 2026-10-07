import { useState } from 'react';
import { Search, Plus, Eye, EyeOff, Copy, Trash2, Shield } from 'lucide-react';

const initialPasswords = [
  { id: 1, name: 'Gmail', username: 'contact@example.invalid', password: '', strength: 4 },
  { id: 2, name: 'GitHub', username: 'devuser', password: '', strength: 4 },
  { id: 3, name: 'Netflix', username: 'contact@example.invalid', password: '', strength: 2 },
  { id: 4, name: 'Bank', username: 'jsmith', password: '', strength: 5 },
  { id: 5, name: 'Twitter', username: '@techie', password: '', strength: 3 },
];

export default function Keychain() {
  const [passwords, setPasswords] = useState(initialPasswords);
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');

  const filtered = passwords.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const strengthColor = (s: number) => s <= 2 ? 'bg-red-500' : s <= 3 ? 'bg-amber-500' : s <= 4 ? 'bg-green-500' : 'bg-emerald-600';
  const strengthText = (s: number) => s <= 2 ? 'Weak' : s <= 3 ? 'Fair' : s <= 4 ? 'Strong' : 'Very Strong';

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 16; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewPass(pass);
  };

  const addPassword = () => {
    if (!newName.trim()) return;
    const strength = newPass.length > 12 ? 4 : newPass.length > 8 ? 3 : 2;
    setPasswords([...passwords, { id: Date.now(), name: newName, username: newUser, password: newPass, strength }]);
    setNewName(''); setNewUser(''); setNewPass(''); setShowAdd(false);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={20} className="text-green-500" />
        <h2 className="text-lg font-semibold">Passwords</h2>
        <button onClick={() => setShowAdd(true)} className="ml-auto p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600"><Plus size={14} /></button>
      </div>
      <div className="relative mb-3">
        <Search size={12} className="absolute left-3 top-2 text-gray-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search passwords" className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none" />
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{p.name}</span>
              <div className="flex gap-1">
                <button onClick={() => setShowPassword({ ...showPassword, [p.id]: !showPassword[p.id] })} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5">
                  {showPassword[p.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button onClick={() => navigator.clipboard?.writeText(p.password)} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"><Copy size={12} /></button>
                <button onClick={() => setPasswords(passwords.filter((pw) => pw.id !== p.id))} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="text-xs text-gray-500 mb-1">{p.username}</div>
            <div className="text-xs font-mono bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
              {showPassword[p.id] ? p.password : ''.repeat(p.password.length)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full ${strengthColor(p.strength)}`} style={{ width: `${(p.strength / 5) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-500">{strengthText(p.strength)}</span>
            </div>
          </div>
        ))}
      </div>
      {showAdd && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-semibold mb-3">Add Password</h3>
            <div className="space-y-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Website" className="w-full p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none" />
              <input value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="Username" className="w-full p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none" />
              <div className="flex gap-2">
                <input value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Password" className="flex-1 p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm outline-none" />
                <button onClick={generatePassword} className="px-3 py-2 rounded-lg bg-blue-500 text-white text-xs">Generate</button>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm">Cancel</button>
              <button onClick={addPassword} className="flex-1 p-2 rounded-lg bg-blue-500 text-white text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
