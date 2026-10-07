import { create } from 'zustand';
import type { WindowState, FileSystemNode, Theme, Toast } from '@/types';

let zIndexCounter = 100;

function generateFs(): FileSystemNode {
  const now = Date.now();
  return {
    id: 'root',
    name: '/',
    type: 'directory',
    parentId: null,
    createdAt: now,
    modifiedAt: now,
    children: [
      {
        id: 'users', name: 'Users', type: 'directory', parentId: 'root', createdAt: now, modifiedAt: now,
        children: [
          {
            id: 'guest', name: 'guest', type: 'directory', parentId: 'users', createdAt: now, modifiedAt: now,
            children: [
              {
                id: 'desktop', name: 'Desktop', type: 'directory', parentId: 'guest', createdAt: now, modifiedAt: now,
                children: [
                  { id: 'df1', name: 'Welcome.txt', type: 'file', content: 'Welcome to Web Desktop Web!\n\nThis is a web-based operating system with 50+ applications.\n\nExplore the Dock below to launch applications.', parentId: 'desktop', createdAt: now, modifiedAt: now, size: 128 },
                  { id: 'df2', name: 'Projects', type: 'directory', parentId: 'desktop', createdAt: now, modifiedAt: now, children: [] },
                ]
              },
              {
                id: 'documents', name: 'Documents', type: 'directory', parentId: 'guest', createdAt: now, modifiedAt: now,
                children: [
                  { id: 'doc1', name: 'Notes.md', type: 'file', content: '# My Notes\n\n- Review project specs\n- Update resume\n- Call mom', parentId: 'documents', createdAt: now, modifiedAt: now, size: 56 },
                  { id: 'doc2', name: 'Ideas.txt', type: 'file', content: 'App ideas:\n1. Smart home dashboard\n2. AI writing assistant\n3. Code snippet manager', parentId: 'documents', createdAt: now, modifiedAt: now, size: 78 },
                ]
              },
              {
                id: 'downloads', name: 'Downloads', type: 'directory', parentId: 'guest', createdAt: now, modifiedAt: now,
                children: [
                  { id: 'dl1', name: 'report.pdf', type: 'file', content: 'PDF placeholder', parentId: 'downloads', createdAt: now, modifiedAt: now, size: 2048 },
                ]
              },
              {
                id: 'pictures', name: 'Pictures', type: 'directory', parentId: 'guest', createdAt: now, modifiedAt: now,
                children: [
                  { id: 'pic1', name: 'Screenshot_001.png', type: 'file', content: 'PNG placeholder', parentId: 'pictures', createdAt: now, modifiedAt: now, size: 1024 },
                  { id: 'pic2', name: 'Wallpaper', type: 'directory', parentId: 'pictures', createdAt: now, modifiedAt: now, children: [] },
                ]
              },
              {
                id: 'music', name: 'Music', type: 'directory', parentId: 'guest', createdAt: now, modifiedAt: now,
                children: []
              },
              {
                id: 'movies', name: 'Movies', type: 'directory', parentId: 'guest', createdAt: now, modifiedAt: now,
                children: []
              },
            ]
          }
        ]
      },
      {
        id: 'applications', name: 'Applications', type: 'directory', parentId: 'root', createdAt: now, modifiedAt: now,
        children: []
      },
      {
        id: 'system', name: 'System', type: 'directory', parentId: 'root', createdAt: now, modifiedAt: now,
        children: [
          { id: 'sys1', name: 'Preferences.plist', type: 'file', content: 'System preferences file', parentId: 'system', createdAt: now, modifiedAt: now, size: 256 },
        ]
      },
    ]
  };
}

interface OSState {
  // Boot
  booted: boolean;
  setBooted: (v: boolean) => void;

  // Theme
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  // Windows
  windows: WindowState[];
  openApp: (appId: string, defaultW: number, defaultH: number) => string;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string, screenW: number, screenH: number) => void;
  restoreWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  updateWindowPos: (windowId: string, x: number, y: number) => void;
  updateWindowSize: (windowId: string, w: number, h: number) => void;
  activeWindowId: string | null;

  // Desktop
  wallpaper: string;
  setWallpaper: (w: string) => void;

  // File System
  fs: FileSystemNode;
  getNodeById: (id: string) => FileSystemNode | null;
  getNodeByPath: (path: string) => FileSystemNode | null;
  addNode: (parentId: string, node: FileSystemNode) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<FileSystemNode>) => void;

  // Clipboard
  clipboard: string | null;
  clipboardHistory: string[];
  copy: (data: string) => void;

  // Toasts
  toasts: Toast[];
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Context menu
  contextMenu: { x: number; y: number; items: { label: string; action: () => void; icon?: string }[] } | null;
  showContextMenu: (cm: { x: number; y: number; items: { label: string; action: () => void; icon?: string }[] }) => void;
  hideContextMenu: () => void;
}

export const useOSStore = create<OSState>((set, get) => ({
  booted: false,
  setBooted: (v) => set({ booted: v }),

  theme: (typeof window !== 'undefined' && localStorage.getItem('theme') as Theme) || 'light',
  setTheme: (t) => {
    set({ theme: t });
    localStorage.setItem('theme', t);
  },
  toggleTheme: () => {
    const t = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: t });
    localStorage.setItem('theme', t);
  },

  windows: [],
  openApp: (appId, defaultW, defaultH) => {
    const id = `win_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    zIndexCounter++;
    const sw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const sh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const w = Math.min(defaultW, sw - 80);
    const h = Math.min(defaultH, sh - 100);
    const x = Math.max(40, (sw - w) / 2 + (get().windows.length * 20) % 120);
    const y = Math.max(40, (sh - h) / 2 + (get().windows.length * 20) % 120);

    const newWindow: WindowState = {
      id,
      appId,
      x,
      y,
      width: w,
      height: h,
      zIndex: zIndexCounter,
      isMinimized: false,
      isMaximized: false,
    };
    set((state) => ({
      windows: [...state.windows, newWindow],
      activeWindowId: id,
    }));
    return id;
  },
  closeWindow: (windowId) => {
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== windowId),
      activeWindowId: state.activeWindowId === windowId
        ? state.windows.filter((w) => w.id !== windowId && !w.isMinimized).slice(-1)[0]?.id || null
        : state.activeWindowId,
    }));
  },
  minimizeWindow: (windowId) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, isMinimized: true } : w
      ),
      activeWindowId: state.activeWindowId === windowId
        ? state.windows.filter((w) => w.id !== windowId && !w.isMinimized).slice(-1)[0]?.id || null
        : state.activeWindowId,
    }));
  },
  maximizeWindow: (windowId, screenW, screenH) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId
          ? { ...w, isMaximized: true, prevRect: { x: w.x, y: w.y, width: w.width, height: w.height }, x: 0, y: 0, width: screenW, height: screenH - 28 }
          : w
      ),
    }));
  },
  restoreWindow: (windowId) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId && w.prevRect
          ? { ...w, isMaximized: false, x: w.prevRect.x, y: w.prevRect.y, width: w.prevRect.width, height: w.prevRect.height }
          : w
      ),
    }));
  },
  focusWindow: (windowId) => {
    zIndexCounter++;
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, zIndex: zIndexCounter, isMinimized: false } : w
      ),
      activeWindowId: windowId,
    }));
  },
  updateWindowPos: (windowId, x, y) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, x, y } : w
      ),
    }));
  },
  updateWindowSize: (windowId, w, h) => {
    set((state) => ({
      windows: state.windows.map((win) =>
        win.id === windowId ? { ...win, width: w, height: h } : win
      ),
    }));
  },
  activeWindowId: null,

  wallpaper: localStorage.getItem('wallpaper') || 'gradient',
  setWallpaper: (w) => {
    set({ wallpaper: w });
    localStorage.setItem('wallpaper', w);
  },

  fs: generateFs(),
  getNodeById: (id) => {
    const search = (node: FileSystemNode): FileSystemNode | null => {
      if (node.id === id) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = search(child);
          if (found) return found;
        }
      }
      return null;
    };
    return search(get().fs);
  },
  getNodeByPath: (path) => {
    const parts = path.split('/').filter(Boolean);
    let current = get().fs;
    for (const part of parts) {
      if (!current.children) return null;
      const found = current.children.find((c) => c.name === part);
      if (!found) return null;
      current = found;
    }
    return current;
  },
  addNode: (parentId, node) => {
    set((state) => {
      const newFs = { ...state.fs };
      const parent = (function search(n: FileSystemNode): FileSystemNode | null {
        if (n.id === parentId) return n;
        if (n.children) {
          for (const c of n.children) {
            const f = search(c);
            if (f) return f;
          }
        }
        return null;
      })(newFs);
      if (parent && parent.children) {
        parent.children.push(node);
      }
      return { fs: newFs };
    });
  },
  removeNode: (id) => {
    set((state) => {
      const remove = (n: FileSystemNode): boolean => {
        if (!n.children) return false;
        const idx = n.children.findIndex((c) => c.id === id);
        if (idx >= 0) {
          n.children.splice(idx, 1);
          return true;
        }
        for (const c of n.children) {
          if (remove(c)) return true;
        }
        return false;
      };
      const newFs = { ...state.fs };
      remove(newFs);
      return { fs: newFs };
    });
  },
  updateNode: (id, updates) => {
    set((state) => {
      const update = (n: FileSystemNode): boolean => {
        if (n.id === id) {
          Object.assign(n, updates);
          return true;
        }
        if (n.children) {
          for (const c of n.children) {
            if (update(c)) return true;
          }
        }
        return false;
      };
      const newFs = { ...state.fs };
      update(newFs);
      return { fs: newFs };
    });
  },

  clipboard: null,
  clipboardHistory: [],
  copy: (data) => {
    set((state) => ({
      clipboard: data,
      clipboardHistory: [data, ...state.clipboardHistory].slice(0, 20),
    }));
  },

  toasts: [],
  addToast: (t) => {
    const id = `toast_${Date.now()}`;
    set((state) => ({ toasts: [...state.toasts, { ...t, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, t.duration || 3000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  contextMenu: null,
  showContextMenu: (cm) => set({ contextMenu: cm }),
  hideContextMenu: () => set({ contextMenu: null }),
}));
