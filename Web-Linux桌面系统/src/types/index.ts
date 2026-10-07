export interface AppMetadata {
  id: string;
  name: string;
  icon: string; // lucide icon name
  category: 'system' | 'productivity' | 'creative' | 'entertainment' | 'game';
  component: React.ComponentType;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  canResize?: boolean;
}

export interface WindowState {
  id: string;
  appId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  prevRect?: { x: number; y: number; width: number; height: number };
  title?: string;
}

export interface DesktopIcon {
  id: string;
  appId: string;
  name: string;
  x: number;
  y: number;
}

export interface FileSystemNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileSystemNode[];
  parentId: string | null;
  createdAt: number;
  modifiedAt: number;
  size?: number;
  icon?: string;
}

export type Theme = 'light' | 'dark';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}
