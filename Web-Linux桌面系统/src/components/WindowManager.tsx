import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { getAppById } from '@/apps';
import {
  X, Minus, Square, ChevronLeft, ChevronRight,
} from 'lucide-react';

export default function WindowManager() {
  const { windows, closeWindow, minimizeWindow, maximizeWindow, restoreWindow, focusWindow, updateWindowPos, updateWindowSize } = useOSStore();
  const resizingRef = useRef<{ windowId: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const draggingRef = useRef<{ windowId: string; offsetX: number; offsetY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, windowId: string) => {
    focusWindow(windowId);
    const win = windows.find((w) => w.id === windowId);
    if (!win || win.isMaximized) return;
    draggingRef.current = {
      windowId,
      offsetX: e.clientX - win.x,
      offsetY: e.clientY - win.y,
    };
  }, [windows, focusWindow]);

  const handleResizeStart = useCallback((e: React.MouseEvent, windowId: string) => {
    e.stopPropagation();
    const win = windows.find((w) => w.id === windowId);
    if (!win || win.isMaximized) return;
    resizingRef.current = {
      windowId,
      startX: e.clientX,
      startY: e.clientY,
      startW: win.width,
      startH: win.height,
    };
  }, [windows]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (draggingRef.current) {
      const { windowId, offsetX, offsetY } = draggingRef.current;
      const sw = window.innerWidth;
      const sh = window.innerHeight;
      const win = windows.find((w) => w.id === windowId);
      if (!win) return;
      let nx = e.clientX - offsetX;
      let ny = e.clientY - offsetY;
      // Rubber-banding: allow elastic overshoot
      const elasticity = 0.5;
      const maxOvershoot = 60;
      if (nx < -maxOvershoot) nx = -maxOvershoot + (nx + maxOvershoot) * elasticity;
      if (ny < -maxOvershoot + 28) ny = -maxOvershoot + 28 + (ny + maxOvershoot - 28) * elasticity;
      if (nx + win.width > sw + maxOvershoot) nx = sw - win.width + maxOvershoot + (nx - sw + win.width - maxOvershoot) * elasticity;
      if (ny + win.height > sh + maxOvershoot) ny = sh - win.height + maxOvershoot + (ny - sh + win.height - maxOvershoot) * elasticity;
      updateWindowPos(windowId, nx, ny);
    }
    if (resizingRef.current) {
      const { windowId, startX, startY, startW, startH } = resizingRef.current;
      const newW = Math.max(300, startW + e.clientX - startX);
      const newH = Math.max(200, startH + e.clientY - startY);
      updateWindowSize(windowId, newW, newH);
    }
  }, [windows, updateWindowPos, updateWindowSize]);

  const handleGlobalMouseUp = useCallback(() => {
    if (draggingRef.current) {
      const { windowId } = draggingRef.current;
      const win = windows.find((w) => w.id === windowId);
      if (win) {
        let nx = Math.max(0, win.x);
        let ny = Math.max(28, win.y);
        if (nx !== win.x || ny !== win.y) updateWindowPos(windowId, nx, ny);
      }
      draggingRef.current = null;
    }
    resizingRef.current = null;
  }, [windows, updateWindowPos]);

  // Attach global listeners
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pt-7 pb-14 overflow-hidden"
      onMouseMove={(e) => {
        if (draggingRef.current || resizingRef.current) {
          e.preventDefault();
          handleGlobalMouseMove(e as unknown as MouseEvent);
        }
      }}
      onMouseUp={handleGlobalMouseUp}
      onMouseLeave={handleGlobalMouseUp}
    >
      {windows.filter((w) => !w.isMinimized).map((window) => {
        const app = getAppById(window.appId);
        if (!app) return null;
        const AppComponent = app.component;

        return (
          <motion.div
            key={window.id}
            className="absolute flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              left: window.x,
              top: window.y,
              width: window.width,
              height: window.height,
              zIndex: window.zIndex,
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onMouseDown={() => focusWindow(window.id)}
          >
            {/* Title bar */}
            <div
              className="h-9 flex items-center px-3 select-none"
              style={{
                background: 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
              }}
              onMouseDown={(e) => handleMouseDown(e, window.id)}
            >
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => closeWindow(window.id)}
                  className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center group"
                >
                  <X size={8} className="opacity-0 group-hover:opacity-100 text-black" />
                </button>
                <button
                  onClick={() => minimizeWindow(window.id)}
                  className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 flex items-center justify-center group"
                >
                  <Minus size={8} className="opacity-0 group-hover:opacity-100 text-black" />
                </button>
                <button
                  onClick={() => window.isMaximized ? restoreWindow(window.id) : maximizeWindow(window.id, 1200, 800)}
                  className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 flex items-center justify-center group"
                >
                  <Square size={6} className="opacity-0 group-hover:opacity-100 text-black" />
                </button>
              </div>
              <span className="absolute left-1/2 -translate-x-1/2 text-xs font-medium text-gray-700">
                {app.name}
              </span>
            </div>
            {/* Window content */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-[#1C1C1E]">
              <AppComponent />
            </div>
            {/* Resize handle */}
            {!window.isMaximized && (
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                onMouseDown={(e) => handleResizeStart(e, window.id)}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
