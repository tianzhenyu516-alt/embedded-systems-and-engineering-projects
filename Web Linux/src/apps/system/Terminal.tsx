import { useState, useRef, useEffect } from 'react';
import { useOSStore } from '@/store/osStore';

interface CmdHistory { cmd: string; output: string; cwd: string }

export default function Terminal() {
  const [history, setHistory] = useState<CmdHistory[]>([
    { cmd: '', output: 'Welcome to Web Desktop Terminal\nType \"help\" for available commands', cwd: '~' },
  ]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('/Users/guest');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [history]);

  const resolvePath = (path: string) => {
    if (path.startsWith('/')) return path;
    if (path === '~') return '/Users/guest';
    return cwd + '/' + path;
  };

  const getNode = (path: string) => useOSStore.getState().getNodeByPath(path);

  const execute = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);
    let output = '';

    switch (command) {
      case 'help':
        output = `Available commands:\n  ls [path]       List directory contents\n  cd [path]       Change directory\n  pwd             Print working directory\n  mkdir <name>    Create directory\n  rm <name>       Remove file/directory\n  cat <file>      Display file contents\n  echo <text>     Print text\n  date            Show current date/time\n  whoami          Show current user\n  clear           Clear terminal\n  touch <file>    Create empty file\n  tree            Show directory tree`;
        break;
      case 'ls': {
        const path = args[0] ? resolvePath(args[0]) : cwd;
        const node = getNode(path);
        if (!node) output = `ls: cannot access '${path}': No such file or directory`;
        else if (node.type === 'file') output = node.name;
        else if (node.children) output = node.children.map((c) => (c.type === 'directory' ? c.name + '/' : c.name)).join('\n');
        break;
      }
      case 'cd': {
        const path = args[0] ? resolvePath(args[0]) : '/Users/guest';
        const node = getNode(path);
        if (!node) output = `cd: no such file or directory: ${args[0]}`;
        else if (node.type !== 'directory') output = `cd: not a directory: ${args[0]}`;
        else setCwd(path);
        break;
      }
      case 'pwd': output = cwd; break;
      case 'whoami': output = 'guest'; break;
      case 'date': output = new Date().toString(); break;
      case 'clear': setHistory([]); return;
      case 'echo': output = args.join(' '); break;
      case 'mkdir': {
        if (!args[0]) { output = 'mkdir: missing operand'; break; }
        const parent = getNode(cwd);
        if (parent && parent.children) {
          const exists = parent.children.find((c) => c.name === args[0]);
          if (exists) output = `mkdir: cannot create directory '${args[0]}': File exists`;
          else {
            useOSStore.getState().addNode(parent.id, {
              id: `fs_${Date.now()}`, name: args[0], type: 'directory', parentId: parent.id,
              createdAt: Date.now(), modifiedAt: Date.now(), children: [],
            });
            output = '';
          }
        }
        break;
      }
      case 'touch': {
        if (!args[0]) { output = 'touch: missing file operand'; break; }
        const parent = getNode(cwd);
        if (parent && parent.children) {
          useOSStore.getState().addNode(parent.id, {
            id: `fs_${Date.now()}`, name: args[0], type: 'file', content: '', parentId: parent.id,
            createdAt: Date.now(), modifiedAt: Date.now(), size: 0,
          });
        }
        break;
      }
      case 'cat': {
        if (!args[0]) { output = 'cat: missing file operand'; break; }
        const path = resolvePath(args[0]);
        const node = getNode(path);
        if (!node) output = `cat: ${args[0]}: No such file`;
        else if (node.type === 'directory') output = `cat: ${args[0]}: Is a directory`;
        else output = node.content || '';
        break;
      }
      case 'rm': {
        if (!args[0]) { output = 'rm: missing operand'; break; }
        const path = resolvePath(args[0]);
        const node = getNode(path);
        if (!node) output = `rm: cannot remove '${args[0]}': No such file`;
        else { useOSStore.getState().removeNode(node.id); }
        break;
      }
      case 'tree': {
        const build = (node: any, prefix = ''): string => {
          if (!node.children) return '';
          let res = '';
          node.children.forEach((child: any, i: number) => {
            const isLast = i === node.children.length - 1;
            res += prefix + (isLast ? '└── ' : '├── ') + child.name + '\n';
            if (child.children) res += build(child, prefix + (isLast ? '    ' : '│   '));
          });
          return res;
        };
        const node = getNode(cwd);
        output = node ? '.' + '\n' + build(node) : '';
        break;
      }
      default: output = `${command}: command not found`;
    }

    const shortCwd = cwd.replace('/Users/guest', '~');
    setHistory((h) => [...h, { cmd: trimmed, output, cwd: shortCwd }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { execute(input); setInput(''); }
    if (e.key === 'Backspace') {
      e.preventDefault();
      setInput((d) => d.length > 1 ? d.slice(0, -1) : '0');
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-green-400 font-mono text-sm rounded-xl overflow-hidden" onClick={() => inputRef.current?.focus()}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1">
        {history.map((h, i) => (
          <div key={i}>
            {h.cmd && <div className="text-gray-400"><span className="text-blue-400">guest@anduin</span>:<span className="text-blue-300">{h.cwd}</span>$ {h.cmd}</div>}
            {h.output && <pre className="whitespace-pre-wrap text-gray-300">{h.output}</pre>}
          </div>
        ))}
        <div className="flex items-center">
          <span className="text-gray-400"><span className="text-blue-400">guest@anduin</span>:<span className="text-blue-300">{cwd.replace('/Users/guest', '~')}</span>$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none ml-1 text-green-400"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
