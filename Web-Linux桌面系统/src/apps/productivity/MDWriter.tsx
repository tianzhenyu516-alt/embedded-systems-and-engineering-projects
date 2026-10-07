import { useState } from 'react';
import { Eye, Edit3, Download } from 'lucide-react';

export default function MDWriter() {
  const [content, setContent] = useState(`# Hello World\n\nThis is a **Markdown** editor with live preview.\n\n## Features\n- Live preview\n- Syntax highlighting\n- Export support\n\n## Code Example\n\`\`\`javascript\nconst hello = () => {\n  console.log('Hello, world!');\n};\n\`\`\`\n\n> Writing is thinking on paper.\n\nEnjoy writing!`);
  const [preview, setPreview] = useState(true);

  const renderMarkdown = (md: string) => {
    let html = md
      .replace(/^### (.*$)/gim, '<h3 class="text-md font-bold mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\`\`\`([\s\S]*?)\`\`\`/g, '<pre class="bg-black/5 dark:bg-white/5 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto"><code>$1</code></pre>')
      .replace(/\`([^\`]+)\`/g, '<code class="bg-black/5 dark:bg-white/5 px-1 rounded text-xs font-mono">$1</code>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-blue-500 pl-3 my-2 text-gray-600 dark:text-gray-400 italic">$1</blockquote>')
      .replace(/\n/g, '<br />');
    return html;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="flex gap-1">
          <button onClick={() => setPreview(!preview)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
            {preview ? <Edit3 size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button onClick={() => {
          const blob = new Blob([content], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'document.md'; a.click();
        }} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
          <Download size={14} />
        </button>
      </div>
      <div className="flex-1 flex">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={`${preview ? 'w-1/2' : 'w-full'} p-4 text-sm font-mono resize-none outline-none bg-transparent border-r border-gray-200/30 dark:border-gray-700/30`}
        />
        {preview && (
          <div className="w-1/2 p-4 overflow-y-auto text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        )}
      </div>
    </div>
  );
}
