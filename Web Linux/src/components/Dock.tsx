import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { apps } from '@/apps';
import * as Icons from 'lucide-react';

export default function Dock() {
  const { openApp, windows, focusWindow, minimizeWindow, theme } = useOSStore();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const dockApps = [
    'files', 'browser', 'terminal', 'mail', 'calendar', 'notes',
    'calculator', 'settings', 'app-store', 'photos', 'music', 'sketchpad',
    'chess', 'snake', 'dino',
  ];

  const getScale = (idx: number) => {
    if (hoveredIdx === null) return 1;
    const dist = Math.abs(idx - hoveredIdx);
    if (dist === 0) return 1.4;
    if (dist === 1) return 1.2;
    if (dist === 2) return 1.1;
    return 1;
  };

  const isAppOpen = (appId: string) => windows.some((w) => w.appId === appId && !w.isMinimized);
  const getWindowForApp = (appId: string) => windows.find((w) => w.appId === appId);

  const handleClick = (appId: string) => {
    const existingWindow = getWindowForApp(appId);
    if (existingWindow) {
      if (existingWindow.isMinimized) {
        focusWindow(existingWindow.id);
      } else if (useOSStore.getState().activeWindowId === existingWindow.id) {
        minimizeWindow(existingWindow.id);
      } else {
        focusWindow(existingWindow.id);
      }
    } else {
      const app = apps.find((a) => a.id === appId);
      if (app) openApp(appId, app.defaultWidth, app.defaultHeight);
    }
  };

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[9990]">
      <motion.div
        className="flex items-end gap-1 px-3 py-2 rounded-2xl"
        style={{
          background: theme === 'dark'
            ? 'rgba(30, 30, 30, 0.6)'
            : 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.15)',
        }}
      >
        {dockApps.map((appId, idx) => {
          const app = apps.find((a) => a.id === appId);
          if (!app) return null;
          const IconComponent = (Icons as any)[app.icon] || Icons.Circle;
          const scale = getScale(idx);
          const open = isAppOpen(appId);

          return (
            <motion.button
              key={app.id}
              onClick={() => handleClick(appId)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="relative flex flex-col items-center group"
              animate={{ scale }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ originY: 1 }}
            >
              {/* Tooltip */}
              <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap px-2 py-0.5 rounded-md text-xs text-white bg-black/70 pointer-events-none">
                {app.name}
              </div>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md transition-colors"
                style={{
                  background: `linear-gradient(135deg, ${getAppGradient(app.id)})`,
                }}
              >
                <IconComponent size={22} className="text-white" />
              </div>
              {/* Open indicator dot */}
              {open && (
                <div className="w-1 h-1 rounded-full bg-gray-800 dark:bg-white mt-0.5" />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

function getAppGradient(appId: string): string {
  const gradients: Record<string, string> = {
    files: '#3b82f6, #2563eb',
    browser: '#8b5cf6, #7c3aed',
    terminal: '#1f2937, #111827',
    mail: '#3b82f6, #60a5fa',
    calendar: '#ef4444, #dc2626',
    notes: '#fbbf24, #f59e0b',
    calculator: '#374151, #1f2937',
    settings: '#6b7280, #4b5563',
    'app-store': '#3b82f6, #06b6d4',
    photos: '#f472b6, #ec4899',
    music: '#f97316, #ea580c',
    sketchpad: '#10b981, #059669',
    chess: '#8b5cf6, #6366f1',
    snake: '#22c55e, #16a34a',
    dino: '#6b7280, #4b5563',
  };
  return gradients[appId] || '#6b7280, #4b5563';
}
