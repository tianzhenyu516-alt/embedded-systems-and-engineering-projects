import { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import BootScreen from '@/components/BootScreen';
import Desktop from '@/components/Desktop';
import WindowManager from '@/components/WindowManager';
import TopBar from '@/components/TopBar';
import Dock from '@/components/Dock';
import './App.css';

function App() {
  const { booted, setBooted, theme } = useOSStore();

  const handleBootComplete = useCallback(() => {
    setBooted(true);
  }, [setBooted]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className={`w-screen h-screen overflow-hidden select-none ${theme === 'dark' ? 'dark' : ''}`}>
      <AnimatePresence>
        {!booted && <BootScreen onComplete={handleBootComplete} />}
      </AnimatePresence>

      {booted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full h-full"
        >
          {/* Desktop Wallpaper Layer */}
          <Desktop />

          {/* Window Manager Layer */}
          <WindowManager />

          {/* Top Bar */}
          <TopBar />

          {/* Dock */}
          <Dock />
        </motion.div>
      )}
    </div>
  );
}

export default App;
