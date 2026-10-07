import { motion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { apps } from '@/apps';
import * as Icons from 'lucide-react';

const desktopApps = [
  'files', 'browser', 'terminal', 'settings', 'textedit', 'sketchpad',
];

export default function Desktop() {
  const { openApp, wallpaper } = useOSStore();

  const getWallpaper = () => {
    switch (wallpaper) {
      case 'gradient':
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';
      case 'aurora':
        return 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)';
      case 'nature':
        return 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)';
      case 'sunset':
        return 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)';
      case 'dark':
        return '#000000';
      default:
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';
    }
  };

  return (
    <div
      className="absolute inset-0 pt-7 pb-14"
      style={{ background: getWallpaper() }}
    >
      <div className="grid grid-cols-6 gap-4 p-4 auto-rows-min">
        {desktopApps.map((appId) => {
          const app = apps.find((a) => a.id === appId);
          if (!app) return null;
          const IconComponent = (Icons as any)[app.icon] || Icons.Circle;

          return (
            <motion.button
              key={app.id}
              onClick={() => openApp(app.id, app.defaultWidth, app.defaultHeight)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <IconComponent size={28} className="text-white" />
              </div>
              <span className="text-xs text-white font-medium text-shadow drop-shadow-lg max-w-full truncate px-1">
                {app.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
