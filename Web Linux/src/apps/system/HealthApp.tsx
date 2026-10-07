import { useState } from 'react';
import { Footprints, Heart, Flame, Moon, Activity } from 'lucide-react';

const weeklySteps = [6500, 8200, 7800, 9100, 5400, 11200, 4300];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HealthApp() {
  const [tab, setTab] = useState('activity');

  const maxSteps = Math.max(...weeklySteps);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex gap-2 mb-4">
        {(['activity', 'heart', 'sleep'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-full text-xs capitalize ${tab === t ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}>{t}</button>
        ))}
      </div>
      {tab === 'activity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-center">
              <Flame size={20} className="mx-auto text-red-500 mb-1" />
              <div className="text-lg font-bold">342</div>
              <div className="text-xs text-gray-500">Cal</div>
            </div>
            <div className="p-3 rounded-2xl bg-green-50 dark:bg-green-900/20 text-center">
              <Footprints size={20} className="mx-auto text-green-500 mb-1" />
              <div className="text-lg font-bold">6.2k</div>
              <div className="text-xs text-gray-500">Steps</div>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-center">
              <Activity size={20} className="mx-auto text-blue-500 mb-1" />
              <div className="text-lg font-bold">45</div>
              <div className="text-xs text-gray-500">Min</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5">
            <h3 className="text-sm font-semibold mb-3">This Week</h3>
            <div className="flex items-end gap-2 h-32">
              {weeklySteps.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gradient-to-t from-red-400 to-orange-400 rounded-t-lg transition-all" style={{ height: `${(s / maxSteps) * 100}%` }} />
                  <span className="text-xs text-gray-500">{days[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab === 'heart' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-center">
            <Heart size={32} className="mx-auto text-red-500 mb-2" />
            <div className="text-3xl font-bold">72</div>
            <div className="text-xs text-gray-500">BPM - Resting</div>
          </div>
          <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5">
            <h3 className="text-sm font-semibold mb-2">Heart Rate Zones</h3>
            {['Resting (60-100)', 'Fat Burn (100-130)', 'Cardio (130-160)', 'Peak (160-190)'].map((z, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <span className="text-xs">{z}</span>
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${[60, 75, 40, 20][i]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'sleep' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-center">
            <Moon size={32} className="mx-auto text-indigo-500 mb-2" />
            <div className="text-3xl font-bold">7h 24m</div>
            <div className="text-xs text-gray-500">Last Night</div>
          </div>
        </div>
      )}
    </div>
  );
}
