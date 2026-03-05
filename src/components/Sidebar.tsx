import { Bot, FileUp, Loader2, MessageSquare } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Sidebar({ isOpen, isUploading, fileInputRef, onFileUpload }: SidebarProps) {
  return (
    <aside className={cn(
      "transition-all duration-300 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col",
      isOpen ? "w-72" : "w-0 opacity-0 invisible overflow-hidden shrink-0"
    )}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Bot className="w-6 h-6 text-blue-600" />
          <span className="whitespace-nowrap">Enterprise Qwen</span>
        </div>
      </div>

      <div className="px-4 mb-4">
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-medium disabled:opacity-50 transition-all hover:opacity-90"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <FileUp className="w-4 h-4 shrink-0" />}
          <span className="whitespace-nowrap">{isUploading ? 'Processing PDF...' : 'Upload PDF'}</span>
        </button>
        <input type="file" ref={fileInputRef} onChange={onFileUpload} className="hidden" accept=".pdf" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase">History</div>
        {['Technical Review', 'Research Summary'].map((item) => (
          <button key={item} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="truncate">{item}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}