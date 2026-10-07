import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { getAppById } from '@/apps';
import {
  Wifi, Battery, Volume2, Search, Sun, Moon,
  ChevronDown, Command, Power, Settings, Moon as MoonIcon,
  Monitor, Lock, RotateCcw, Sparkles, Wifi as WifiIcon,
  Bluetooth, VolumeX,
} from 'lucide-react';

export default function TopBar() {
  const { theme, toggleTheme, activeWindowId, openApp } = useOSStore();
  const [time, setTime] = useState(new Date());
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [showDatePanel, setShowDatePanel] = useState(false);
  const [showControlCenter, setShowControlCenter] = useState(false);
  const [wifiOn, setWifiOn] = useState(true);
  const [btOn, setBtOn] = useState(true);
  const [volume, setVolume] = useState(75);
  const [brightness, setBrightness] = useState(80);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeApp = activeWindowId ? getAppById(useOSStore.getState().windows.find((w) => w.id === activeWindowId)?.appId || '') : null;

  const timeStr = time.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });

  const menuItems = ['About This Mac', 'System Settings...', 'App Store...', 'Recent Items', 'Force Quit', 'Sleep', 'Restart...', 'Shut Down...'];


  // Quick access apps for spotlight
  const quickApps = [
    { id: 'settings', name: 'System Settings', icon: Settings },
    { id: 'terminal', name: 'Terminal', icon: Monitor },
    { id: 'files', name: 'Files', icon: Monitor },
    { id: 'calculator', name: 'Calculator', icon: Monitor },
  ];

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 h-7 z-[9990] flex items-center px-3 text-xs"
        style={{
          background: theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Left - Apple Menu + App Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">A</span>
            </div>
          </button>
          <span className="font-semibold text-gray-800 dark:text-white">
            {activeApp?.name || 'Finder'}
          </span>
          <div className="flex items-center gap-2 ml-2">
            {['File', 'Edit', 'View', 'Window', 'Help'].map((item) => (
              <button
                key={item}
                className="px-1.5 py-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-gray-700 dark:text-gray-300"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Right - Status Icons */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowControlCenter(!showControlCenter)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
          >
            {wifiOn ? <Wifi size={13} /> : <WifiIcon size={13} className="opacity-40" />}
          </button>
          <button
            onClick={() => setShowControlCenter(!showControlCenter)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
          >
            <Battery size={13} />
          </button>
          <button
            onClick={() => setShowControlCenter(!showControlCenter)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
          >
            {volume > 0 ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          <button
            onClick={() => setShowSpotlight(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
          >
            <Search size={13} />
          </button>
          <button
            onClick={() => setShowDatePanel(!showDatePanel)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-gray-800 dark:text-white"
          >
            {dateStr} {timeStr}
          </button>
        </div>
      </div>

      {/* Apple Menu Dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="fixed top-8 left-2 z-[9991] w-52 rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: theme === 'dark' ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            {menuItems.map((item, i) => (
              <button
                key={item}
                onClick={() => {
                  setShowMenu(false);
                  if (item.includes('Settings')) openApp('settings', 780, 580);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-500 hover:text-white transition-colors ${
                  i === 4 || i === 6 ? 'border-t border-gray-200/20 dark:border-gray-700/20' : ''
                } ${item.includes('Shut Down') || item.includes('Restart') ? 'text-red-500 hover:text-white hover:bg-red-500' : 'text-gray-800 dark:text-gray-200'}`}
              >
                {item}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spotlight */}
      <AnimatePresence>
        {showSpotlight && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[9992] w-[500px] rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: theme === 'dark' ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center gap-2 p-3 border-b border-gray-200/20 dark:border-gray-700/20">
              <Search size={16} className="text-gray-400" />
              <input
                value={spotlightQuery}
                onChange={(e) => setSpotlightQuery(e.target.value)}
                placeholder="Spotlight Search"
                className="flex-1 bg-transparent outline-none text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowSpotlight(false);
                }}
              />
              <button onClick={() => setShowSpotlight(false)} className="text-gray-400 hover:text-gray-600">
                <Command size={14} />
              </button>
            </div>
            <div className="p-2">
              <div className="text-xs text-gray-500 px-2 py-1">QUICK ACCESS</div>
              {quickApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setShowSpotlight(false);
                    openApp(app.id, 780, 580);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-500 hover:text-white transition-colors text-sm"
                >
                  <app.icon size={16} />
                  {app.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date/Time Panel */}
      <AnimatePresence>
        {showDatePanel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="fixed top-8 right-2 z-[9991] w-72 rounded-2xl overflow-hidden shadow-2xl p-4"
            style={{
              background: theme === 'dark' ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="text-3xl font-light mb-1">{timeStr}</div>
            <div className="text-sm text-gray-500 mb-3">{dateStr}</div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-gray-500 py-1">{d}</div>
              ))}
              {Array.from({ length: 31 }, (_, i) => (
                <div
                  key={i}
                  className={`py-1 rounded-full ${i + 1 === time.getDate() ? 'bg-blue-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Center */}
      <AnimatePresence>
        {showControlCenter && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="fixed top-8 right-24 z-[9991] w-64 rounded-2xl overflow-hidden shadow-2xl p-3"
            style={{
              background: theme === 'dark' ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setWifiOn(!wifiOn)}
                className={`p-3 rounded-xl flex items-center gap-2 transition-all ${wifiOn ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}
              >
                <Wifi size={16} />
                <span className="text-xs">Wi-Fi</span>
              </button>
              <button
                onClick={() => setBtOn(!btOn)}
                className={`p-3 rounded-xl flex items-center gap-2 transition-all ${btOn ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5'}`}
              >
                <Bluetooth size={16} />
                <span className="text-xs">Bluetooth</span>
              </button>
              <button
                onClick={toggleTheme}
                className="p-3 rounded-xl flex items-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10"
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                <span className="text-xs">{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>
              <button className="p-3 rounded-xl flex items-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10">
                <RotateCcw size={16} />
                <span className="text-xs">Rotate</span>
              </button>
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Volume2 size={12} className="text-gray-500" />
                <span className="text-xs text-gray-500">Volume</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sun size={12} className="text-gray-500" />
                <span className="text-xs text-gray-500">Brightness</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
