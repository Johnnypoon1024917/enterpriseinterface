'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef } from 'react';
import { Send, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { ChatMessage } from '@/components/ChatMessage';

export default function EnterpriseApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (res.ok) alert('PDF successfully processed by Qwen into pgvector!');
      else alert('Upload failed. Check server console.');
    } catch (err) {
      console.error('Upload Error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-zinc-950 overflow-hidden font-sans">
      
      {/* Import the Modular Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        onFileUpload={handleFileUpload}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
            {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          <div className="text-xs font-mono text-zinc-400">LLM Node: 192.168.192.199</div>
        </header>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto w-full space-y-6 pb-32">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-zinc-400 text-sm mt-32">
                Ask your local Qwen model anything about your documents...
              </div>
            )}
            
            {messages.map((m) => (
              <ChatMessage key={m.id} role={m.role} content={m.content} />
            ))}
          </div>
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