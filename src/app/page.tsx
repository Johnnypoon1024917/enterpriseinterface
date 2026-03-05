'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, PanelLeftClose, PanelLeftOpen, Loader2, Bot } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { ChatMessage } from '@/components/ChatMessage';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

 const handleFormSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputValue.trim() || isThinking) return;

  const userText = inputValue.trim();
  const userMessage = { id: `user-${Date.now()}`, role: 'user' as const, content: userText };

  // Add user message immediately
  setMessages((prev) => [...prev, userMessage]);
  setInputValue('');
  setIsThinking(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, userMessage],
      }),
    });

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }

    if (!res.body) {
      throw new Error('No readable stream');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Create assistant message once
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant' as const, content: '' },
    ]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on newlines, process complete lines only
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // keep incomplete line for next iteration

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6).trim();

          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';

            if (delta && delta.trim()) {
              // Append delta only once per unique chunk
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.id === assistantId) {
                  // Prevent duplicate appends by checking if last content already ends with this delta
                  if (!lastMsg.content.endsWith(delta)) {
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMsg, content: lastMsg.content + delta },
                    ];
                  }
                }
                return prev;
              });
            }
          } catch (err) {
            console.warn('Failed to parse SSE data:', err, dataStr);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Chat stream failed:', err);
    setMessages((prev) => [
      ...prev,
      {
        id: `error-${Date.now()}`,
        role: 'assistant' as const,
        content: `Sorry, something went wrong: ${err.message}`,
      },
    ]);
  } finally {
    setIsThinking(false);
  }
};

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        alert('PDF successfully processed!');
      } else {
        alert('Upload failed. Check server console.');
      }
    } catch (err) {
      console.error('Upload Error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-zinc-950 overflow-hidden font-sans">
      <Sidebar
        isOpen={isSidebarOpen}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        onFileUpload={handleFileUpload}
      />

      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"
          >
            {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">Node: 192.168.192.199:1234</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-3xl mx-auto w-full space-y-8 pb-32">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-sm mt-32 gap-4 text-center animate-in fade-in duration-700">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center">
                  <Bot className="w-8 h-8 text-zinc-500" />
                </div>
                <div>
                  <p className="font-medium text-zinc-600 dark:text-zinc-300">Welcome to Enterprise Qwen</p>
                  <p className="mt-1">Upload a PDF or start typing to query your internal knowledge base.</p>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <ChatMessage key={m.id} role={m.role} content={m.content} />
            ))}

            {isThinking && (
              <div className="flex items-center gap-3 text-zinc-400 text-xs italic ml-12 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Qwen is processing...
              </div>
            )}

            <div ref={messagesEndRef} className="h-px w-full" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white dark:from-zinc-950 dark:via-zinc-950 pt-10">
          <form
            onSubmit={handleFormSubmit}
            className="max-w-3xl mx-auto relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-xl focus-within:ring-2 focus-within:ring-blue-500/20 transition-all"
          >
            <input
              className="flex-1 bg-transparent py-4 px-6 outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 disabled:opacity-50"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Message local Qwen..."
              disabled={isThinking}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isThinking || !inputValue.trim()}
              className="mr-3 p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="max-w-3xl mx-auto text-center mt-3">
            <p className="text-[10px] text-zinc-400">AI models can make mistakes. Consider verifying critical enterprise data.</p>
          </div>
        </div>
      </main>
    </div>
  );
}