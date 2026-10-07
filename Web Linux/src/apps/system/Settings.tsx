import { useState } from 'react';
import { useOSStore } from '@/store/osStore';
import {
  Wifi, Bluetooth, Sun, Moon, Monitor, Volume2, Globe,
  Shield, User, Bell, Keyboard, Mouse, Battery, Printer, Usb, Cloud, Lock, Palette, Accessibility,
} from 'lucide-react';

const settingsSections = [
  { id: 'general', icon: Globe, label: 'General' },
  { id: 'wifi', icon: Wifi, label: 'Wi-Fi' },
  { id: 'bluetooth', icon: Bluetooth, label: 'Bluetooth' },
  { id: 'display', icon: Monitor, label: 'Display' },
  { id: 'sound', icon: Volume2, label: 'Sound' },
  { id: 'appearance', icon: Palette, label: 'Appearance' },
  { id: 'security', icon: Shield, label: 'Security' },
  { id: 'users', icon: User, label: 'Users' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'keyboard', icon: Keyboard, label: 'Keyboard' },
  { id: 'mouse', icon: Mouse, label: 'Mouse' },
  { id: 'battery', icon: Battery, label: 'Battery' },
  { id: 'printer', icon: Printer, label: 'Printers' },
  { id: 'usb', icon: Usb, label: 'USB' },
  { id: 'icloud', icon: Cloud, label: 'Cloud' },
  { id: 'privacy', icon: Lock, label: 'Privacy' },
  { id: 'accessibility', icon: Accessibility, label: 'Accessibility' },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState('general');
  const { theme } = useOSStore();
  const [wifiOn, setWifiOn] = useState(true);
  const [btOn, setBtOn] = useState(true);
  const [volume, setVolume] = useState(75);
  const [brightness, setBrightness] = useState(80);
  const [notifOn, setNotifOn] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [location, setLocation] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [dockSize, setDockSize] = useState(50);
  const [accentColor, setAccentColor] = useState('#007AFF');

  const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55', '#5AC8FA'];

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium">About</span>
              <span className="text-xs text-gray-500">Web Desktop Web v1.0</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium">Software Update</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={autoUpdate} onChange={() => setAutoUpdate(!autoUpdate)} className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </label>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium">Location Services</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={location} onChange={() => setLocation(!location)} className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </label>
            </div>
          </div>
        );
      case 'wifi':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium">Wi-Fi</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={wifiOn} onChange={() => setWifiOn(!wifiOn)} className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </label>
            </div>
            {wifiOn && (
              <div className="space-y-2">
                {['Home-5G', 'Office-WiFi', 'Starbucks_Free', 'Web Desktop-Guest'].map((net) => (
                  <div key={net} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <Wifi size={16} />
                      <span className="text-sm">{net}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="w-1 bg-current rounded-full" style={{ height: `${8 + i * 4}px` }} />
                      ))}
                      <Lock size={12} className="ml-1 opacity-50" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'bluetooth':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium">Bluetooth</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={btOn} onChange={() => setBtOn(!btOn)} className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </label>
            </div>
            {btOn && (
              <div className="space-y-2">
                {['AirPods Pro', 'Magic Keyboard', 'MX Master 3', 'Apple Watch'].map((dev) => (
                  <div key={dev} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <Bluetooth size={16} />
                      <span className="text-sm">{dev}</span>
                    </div>
                    <span className="text-xs text-gray-500">Connected</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-5">
            <div>
              <span className="text-sm font-medium mb-3 block">Appearance</span>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => useOSStore.getState().setTheme('light')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-blue-500 bg-white' : 'border-transparent bg-black/5 dark:bg-white/5'}`}>
                  <Sun size={24} />
                  <span className="text-xs">Light</span>
                </button>
                <button onClick={() => useOSStore.getState().setTheme('dark')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-blue-500 bg-black/20' : 'border-transparent bg-black/5 dark:bg-white/5'}`}>
                  <Moon size={24} />
                  <span className="text-xs">Dark</span>
                </button>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium mb-3 block">Accent Color</span>
              <div className="flex gap-2 flex-wrap">
                {colors.map((c) => (
                  <button key={c} onClick={() => setAccentColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${accentColor === c ? 'border-white shadow-lg scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium mb-2 block">Dock Size</span>
              <input type="range" min="30" max="70" value={dockSize} onChange={(e) => setDockSize(Number(e.target.value))} className="w-full accent-blue-500" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium">Animations</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={animations} onChange={() => setAnimations(!animations)} className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </label>
            </div>
          </div>
        );
      case 'sound':
        return (
          <div className="space-y-5">
            <div>
              <span className="text-sm font-medium mb-2 block">Output Volume</span>
              <div className="flex items-center gap-3">
                <Volume2 size={16} />
                <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="flex-1 accent-blue-500" />
                <span className="text-xs w-8 text-right">{volume}%</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 space-y-2">
              <span className="text-sm font-medium">Output Devices</span>
              {['Built-in Speakers', 'AirPods Pro', 'External Speakers'].map((d) => (
                <div key={d} className="flex items-center gap-2 py-1">
                  <div className={`w-3 h-3 rounded-full border-2 ${d === 'Built-in Speakers' ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`} />
                  <span className="text-sm">{d}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'display':
        return (
          <div className="space-y-5">
            <div>
              <span className="text-sm font-medium mb-2 block">Brightness</span>
              <div className="flex items-center gap-3">
                <Sun size={16} />
                <input type="range" min="10" max="100" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="flex-1 accent-blue-500" />
                <span className="text-xs w-8 text-right">{brightness}%</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium mb-2 block">Resolution</span>
              <select className="w-full p-2 rounded-lg bg-white dark:bg-black/30 text-sm border border-gray-300 dark:border-gray-700">
                <option>2560 x 1440 (Default)</option>
                <option>1920 x 1080</option>
                <option>1680 x 1050</option>
                <option>1280 x 800</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium">Night Shift</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </label>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium">Allow Notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifOn} onChange={() => setNotifOn(!notifOn)} className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </label>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium">Do Not Disturb</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={doNotDisturb} onChange={() => setDoNotDisturb(!doNotDisturb)} className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </label>
            </div>
          </div>
        );
      case 'battery':
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 text-center">
              <Battery size={48} className="mx-auto mb-2 text-green-500" />
              <span className="text-2xl font-bold">87%</span>
              <p className="text-xs text-gray-500 mt-1">About 8 hours remaining</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium">Low Power Mode</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </label>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-sm font-medium">Show Percentage</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </label>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Monitor size={48} className="mb-3 opacity-30" />
            <span className="text-sm">Select a setting from the sidebar</span>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-gray-200/30 dark:border-gray-700/30 p-2 overflow-y-auto">
        {settingsSections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all ${
              activeSection === section.id
                ? 'bg-blue-500 text-white'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <section.icon size={16} />
            {section.label}
          </button>
        ))}
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}
