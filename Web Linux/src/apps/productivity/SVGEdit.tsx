import { useState } from 'react';
import { Code, Eye, Download } from 'lucide-react';

const defaultSVG = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">\n  <circle cx="100" cy="100" r="80" fill="#3b82f6" />\n  <rect x="60" y="60" width="80" height="80" fill="#ef4444" rx="10" />\n  <text x="100" y="140" text-anchor="middle" fill="white" font-size="20">SVG</text>\n</svg>`;

export default function SVGEdit() {
  const [code, setCode] = useState(defaultSVG);
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="flex gap-1">
          <button onClick={() => setShowPreview(!showPreview)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">{showPreview ? <Code size={14} /> : <Eye size={14} />}</button>
        </div>
        <button onClick={() => {
          const blob = new Blob([code], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'image.svg'; a.click();
        }} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Download size={14} /></button>
      </div>
      <div className="flex-1 flex">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${showPreview ? 'w-1/2' : 'w-full'} p-4 text-xs font-mono resize-none outline-none bg-transparent border-r border-gray-200/30 dark:border-gray-700/30`}
        />
        {showPreview && (
          <div className="w-1/2 flex items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-auto p-4">
            <div dangerouslySetInnerHTML={{ __html: code }} />
          </div>
        )}
      </div>
    </div>
  );
}
