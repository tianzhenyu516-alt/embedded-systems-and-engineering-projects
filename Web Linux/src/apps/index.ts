import type { AppMetadata } from '@/types';

// System & Tools
import Settings from './system/Settings';
import Calculator from './system/Calculator';
import CalendarApp from './system/CalendarApp';
import Contacts from './system/Contacts';
import Clock from './system/Clock';
import Weather from './system/Weather';
import FileManager from './system/FileManager';
import Notes from './system/Notes';
import Reminders from './system/Reminders';
import Terminal from './system/Terminal';
import Preview from './system/Preview';
import SystemInfo from './system/SystemInfo';
import Translate from './system/Translate';
import ActivityMonitor from './system/ActivityMonitor';
import Mail from './system/Mail';
import Maps from './system/Maps';
import Speedtest from './system/Speedtest';
import MusicApp from './system/MusicApp';
import Photos from './system/Photos';
import Camera from './system/Camera';
import HomeApp from './system/HomeApp';
import HealthApp from './system/HealthApp';
import Stocks from './system/Stocks';
import Books from './system/Books';
import Browser from './system/Browser';
import AppStore from './system/AppStore';
import DiskUtility from './system/DiskUtility';
import Keychain from './system/Keychain';
import Shortcuts from './system/Shortcuts';
import VoiceMemos from './system/VoiceMemos';
import Podcasts from './system/Podcasts';
import Wallet from './system/Wallet';
import FindMy from './system/FindMy';

// Productivity & Creative
import TextEdit from './productivity/TextEdit';
import Sketchpad from './productivity/Sketchpad';
import DevUtils from './productivity/DevUtils';
import Pasteboard from './productivity/Pasteboard';
import MDWriter from './productivity/MDWriter';
import ColorPicker from './productivity/ColorPicker';
import SVGEdit from './productivity/SVGEdit';
import APITester from './productivity/APITester';
import Kanban from './productivity/Kanban';
import MindNode from './productivity/MindNode';
import Excalidraw from './productivity/Excalidraw';
import Screenshot from './productivity/Screenshot';
import Pages from './productivity/Pages';
import Numbers from './productivity/Numbers';
import Keynote from './productivity/Keynote';

// Entertainment & Games
import Chess from './games/Chess';
import Solitaire from './games/Solitaire';
import SnakeGame from './games/SnakeGame';
import TicTacToe from './games/TicTacToe';
import Minesweeper from './games/Minesweeper';
import Sudoku from './games/Sudoku';
import Game2048 from './games/Game2048';
import DinoGame from './games/DinoGame';
import DrumMachine from './games/DrumMachine';
import Dice from './games/Dice';
import Tarot from './games/Tarot';
import Kaleidoscope from './games/Kaleidoscope';
import Pinball from './games/Pinball';
import Metronome from './games/Metronome';

export const apps: AppMetadata[] = [
  { id: 'settings', name: 'Settings', icon: 'Settings', category: 'system', component: Settings, defaultWidth: 780, defaultHeight: 580 },
  { id: 'calculator', name: 'Calculator', icon: 'Calculator', category: 'system', component: Calculator, defaultWidth: 360, defaultHeight: 520, canResize: false },
  { id: 'calendar', name: 'Calendar', icon: 'Calendar', category: 'system', component: CalendarApp, defaultWidth: 700, defaultHeight: 520 },
  { id: 'contacts', name: 'Contacts', icon: 'Contact', category: 'system', component: Contacts, defaultWidth: 640, defaultHeight: 500 },
  { id: 'clock', name: 'Clock', icon: 'Clock', category: 'system', component: Clock, defaultWidth: 500, defaultHeight: 420 },
  { id: 'weather', name: 'Weather', icon: 'CloudSun', category: 'system', component: Weather, defaultWidth: 440, defaultHeight: 560 },
  { id: 'files', name: 'Files', icon: 'FolderOpen', category: 'system', component: FileManager, defaultWidth: 800, defaultHeight: 540 },
  { id: 'notes', name: 'Notes', icon: 'StickyNote', category: 'system', component: Notes, defaultWidth: 600, defaultHeight: 500 },
  { id: 'reminders', name: 'Reminders', icon: 'ListChecks', category: 'system', component: Reminders, defaultWidth: 460, defaultHeight: 540 },
  { id: 'terminal', name: 'Terminal', icon: 'Terminal', category: 'system', component: Terminal, defaultWidth: 720, defaultHeight: 440 },
  { id: 'preview', name: 'Preview', icon: 'Eye', category: 'system', component: Preview, defaultWidth: 600, defaultHeight: 500 },
  { id: 'system-info', name: 'System Info', icon: 'Monitor', category: 'system', component: SystemInfo, defaultWidth: 560, defaultHeight: 440 },
  { id: 'translate', name: 'Translate', icon: 'Languages', category: 'system', component: Translate, defaultWidth: 500, defaultHeight: 420 },
  { id: 'activity-monitor', name: 'Activity Monitor', icon: 'Activity', category: 'system', component: ActivityMonitor, defaultWidth: 680, defaultHeight: 480 },
  { id: 'mail', name: 'Mail', icon: 'Mail', category: 'system', component: Mail, defaultWidth: 720, defaultHeight: 540 },
  { id: 'maps', name: 'Maps', icon: 'Map', category: 'system', component: Maps, defaultWidth: 720, defaultHeight: 520 },
  { id: 'speedtest', name: 'Speedtest', icon: 'Gauge', category: 'system', component: Speedtest, defaultWidth: 480, defaultHeight: 460 },
  { id: 'music', name: 'Music', icon: 'Music', category: 'system', component: MusicApp, defaultWidth: 600, defaultHeight: 500 },
  { id: 'photos', name: 'Photos', icon: 'Image', category: 'system', component: Photos, defaultWidth: 640, defaultHeight: 480 },
  { id: 'camera', name: 'Camera', icon: 'Camera', category: 'system', component: Camera, defaultWidth: 560, defaultHeight: 440 },
  { id: 'home', name: 'Home', icon: 'Home', category: 'system', component: HomeApp, defaultWidth: 480, defaultHeight: 520 },
  { id: 'health', name: 'Health', icon: 'Heart', category: 'system', component: HealthApp, defaultWidth: 520, defaultHeight: 560 },
  { id: 'stocks', name: 'Stocks', icon: 'TrendingUp', category: 'system', component: Stocks, defaultWidth: 600, defaultHeight: 480 },
  { id: 'books', name: 'Books', icon: 'BookOpen', category: 'system', component: Books, defaultWidth: 600, defaultHeight: 520 },
  { id: 'browser', name: 'Browser', icon: 'Globe', category: 'system', component: Browser, defaultWidth: 900, defaultHeight: 600 },
  { id: 'app-store', name: 'App Store', icon: 'ShoppingBag', category: 'system', component: AppStore, defaultWidth: 700, defaultHeight: 540 },
  { id: 'disk-utility', name: 'Disk Utility', icon: 'HardDrive', category: 'system', component: DiskUtility, defaultWidth: 560, defaultHeight: 440 },
  { id: 'keychain', name: 'Keychain', icon: 'KeyRound', category: 'system', component: Keychain, defaultWidth: 480, defaultHeight: 440 },
  { id: 'shortcuts', name: 'Shortcuts', icon: 'Zap', category: 'system', component: Shortcuts, defaultWidth: 560, defaultHeight: 480 },
  { id: 'voice-memos', name: 'Voice Memos', icon: 'Mic', category: 'system', component: VoiceMemos, defaultWidth: 440, defaultHeight: 360 },
  { id: 'podcasts', name: 'Podcasts', icon: 'Radio', category: 'system', component: Podcasts, defaultWidth: 560, defaultHeight: 480 },
  { id: 'wallet', name: 'Wallet', icon: 'Wallet', category: 'system', component: Wallet, defaultWidth: 440, defaultHeight: 520 },
  { id: 'find-my', name: 'Find My', icon: 'MapPin', category: 'system', component: FindMy, defaultWidth: 600, defaultHeight: 500 },

  { id: 'textedit', name: 'TextEdit', icon: 'FileText', category: 'productivity', component: TextEdit, defaultWidth: 560, defaultHeight: 480 },
  { id: 'sketchpad', name: 'Sketchpad', icon: 'PenTool', category: 'productivity', component: Sketchpad, defaultWidth: 720, defaultHeight: 540 },
  { id: 'devutils', name: 'DevUtils', icon: 'Code2', category: 'productivity', component: DevUtils, defaultWidth: 640, defaultHeight: 480 },
  { id: 'pasteboard', name: 'Pasteboard', icon: 'Clipboard', category: 'productivity', component: Pasteboard, defaultWidth: 420, defaultHeight: 480 },
  { id: 'mdwriter', name: 'MD Writer', icon: 'FileCode', category: 'productivity', component: MDWriter, defaultWidth: 800, defaultHeight: 560 },
  { id: 'colorpicker', name: 'Color Picker', icon: 'Palette', category: 'productivity', component: ColorPicker, defaultWidth: 440, defaultHeight: 480 },
  { id: 'svgedit', name: 'SVG Edit', icon: 'Edit3', category: 'productivity', component: SVGEdit, defaultWidth: 720, defaultHeight: 540 },
  { id: 'apitester', name: 'API Tester', icon: 'Webhook', category: 'productivity', component: APITester, defaultWidth: 640, defaultHeight: 500 },
  { id: 'kanban', name: 'Kanban', icon: 'LayoutKanban', category: 'productivity', component: Kanban, defaultWidth: 780, defaultHeight: 540 },
  { id: 'mindnode', name: 'MindNode', icon: 'GitBranch', category: 'productivity', component: MindNode, defaultWidth: 780, defaultHeight: 560 },
  { id: 'excalidraw', name: 'Excalidraw', icon: 'Pencil', category: 'productivity', component: Excalidraw, defaultWidth: 800, defaultHeight: 580 },
  { id: 'screenshot', name: 'Screenshot', icon: 'Camera', category: 'productivity', component: Screenshot, defaultWidth: 480, defaultHeight: 360 },
  { id: 'pages', name: 'Pages', icon: 'FileType', category: 'productivity', component: Pages, defaultWidth: 640, defaultHeight: 520 },
  { id: 'numbers', name: 'Numbers', icon: 'Table', category: 'productivity', component: Numbers, defaultWidth: 720, defaultHeight: 520 },
  { id: 'keynote', name: 'Keynote', icon: 'Presentation', category: 'productivity', component: Keynote, defaultWidth: 800, defaultHeight: 560 },

  { id: 'chess', name: 'Chess', icon: 'Crown', category: 'game', component: Chess, defaultWidth: 520, defaultHeight: 560 },
  { id: 'solitaire', name: 'Solitaire', icon: 'Layers', category: 'game', component: Solitaire, defaultWidth: 680, defaultHeight: 540 },
  { id: 'snake', name: 'Snake', icon: 'Snake', category: 'game', component: SnakeGame, defaultWidth: 520, defaultHeight: 560 },
  { id: 'tictactoe', name: 'Tic Tac Toe', icon: 'Grid3X3', category: 'game', component: TicTacToe, defaultWidth: 400, defaultHeight: 460 },
  { id: 'minesweeper', name: 'Minesweeper', icon: 'Bomb', category: 'game', component: Minesweeper, defaultWidth: 400, defaultHeight: 480 },
  { id: 'sudoku', name: 'Sudoku', icon: 'Hash', category: 'game', component: Sudoku, defaultWidth: 440, defaultHeight: 520 },
  { id: '2048', name: '2048', icon: 'Table2', category: 'game', component: Game2048, defaultWidth: 420, defaultHeight: 540 },
  { id: 'dino', name: 'Dino Game', icon: 'Gamepad2', category: 'game', component: DinoGame, defaultWidth: 600, defaultHeight: 260 },
  { id: 'drum', name: 'Drum Machine', icon: 'Drum', category: 'game', component: DrumMachine, defaultWidth: 560, defaultHeight: 400 },
  { id: 'dice', name: 'Dice', icon: 'Dice5', category: 'game', component: Dice, defaultWidth: 380, defaultHeight: 400 },
  { id: 'tarot', name: 'Tarot', icon: 'Sparkles', category: 'game', component: Tarot, defaultWidth: 500, defaultHeight: 520 },
  { id: 'kaleidoscope', name: 'Kaleidoscope', icon: 'Flower2', category: 'game', component: Kaleidoscope, defaultWidth: 600, defaultHeight: 600 },
  { id: 'pinball', name: 'Pinball', icon: 'CircleDot', category: 'game', component: Pinball, defaultWidth: 480, defaultHeight: 640 },
  { id: 'metronome', name: 'Metronome', icon: 'Timer', category: 'game', component: Metronome, defaultWidth: 380, defaultHeight: 420 },
];

export const getAppById = (id: string): AppMetadata | undefined =>
  apps.find((a) => a.id === id);

export const getAppsByCategory = (category: string): AppMetadata[] =>
  apps.filter((a) => a.category === category);
