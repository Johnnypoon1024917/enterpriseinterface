import { Bot, User } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ChatMessage({ role, content }: { role: string, content: string }) {
  const isUser = role === 'user';
  
  return (
    <div className={cn("flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300", isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", 
        isUser ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-100 dark:bg-zinc-800'
      )}>
        {isUser ? <User className="w-5 h-5 text-white dark:text-zinc-900" /> : <Bot className="w-5 h-5 text-blue-600" />}
      </div>
      <div className={cn(
        "px-4 py-2.5 rounded-2xl text-sm max-w-[80%] shadow-sm border", 
        isUser 
          ? 'bg-zinc-900 text-white border-zinc-900' 
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
      )}>
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </div>
  );
}