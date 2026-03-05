'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef } from 'react';
import { 
  Plus, 
  MessageSquare, 
  FileUp, 
  Send, 
  Loader2, 
  Bot, 
  User,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function EnterpriseChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook from @ai-sdk/react as requested
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) alert('PDF successfully processed by local Qwen engine!');
    } catch (err) {
      console.error('Upload Error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar - Poe Layout */}
      <aside className={cn(
        "transition-all duration-300 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col",
        isSidebarOpen ? "w-72" : "w-0 opacity-0 invisible"
      )}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Bot className="w-6 h-6 text-blue-600" />
            <span>Enterprise Qwen</span>
          </div>
        </div>

        <div className="px-4 mb-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            {isUploading ? 'Processing...' : 'Upload PDF'}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
        </div>

        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase">History</div>
          {['Technical Review', 'Research Summary'].map((item) => (
            <button key={item} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
              <MessageSquare className="w-4 h-4" />
              <span className="truncate">{item}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
            {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          <div className="text-xs font-mono text-zinc-500">Local Instance: 192.168.192.199</div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-32">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
              Ask your local Qwen model anything about the uploaded documents.
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-4", m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", m.role === 'user' ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-100 dark:bg-zinc-800')}>
                {m.role === 'user' ? <User className="w-5 h-5 text-white dark:text-zinc-900" /> : <Bot className="w-5 h-5 text-blue-600" />}
              </div>
              <div className={cn("px-4 py-2.5 rounded-2xl text-sm max-w-[80%] shadow-sm border", m.role === 'user' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200')}>
                {m.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white dark:from-zinc-950 dark:via-zinc-950">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-xl focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <input
              className="flex-1 bg-transparent py-4 px-6 outline-none text-sm"
              value={input}
              onChange={handleInputChange}
              placeholder="Message local Qwen..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="mr-3 p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:scale-105 transition-all disabled:opacity-20">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}