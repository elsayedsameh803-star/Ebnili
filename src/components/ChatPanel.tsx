import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, Sparkles, User } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onPickPrompt?: (prompt: string) => void;
}

/**
 * Bolt.new-style conversation column: the prompt + the assistant's reply live
 * in a scrollable thread, while the generated site streams into the preview
 * pane on the right.
 */
export default function ChatPanel({ messages, isGenerating, onPickPrompt }: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isGenerating]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/20">
            <Sparkles size={22} className="text-white" />
          </div>
          <h2 className="text-base font-bold text-neutral-900">ابنِ موقعك بالذكاء الاصطناعي</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
            اكتب وصف الموقع أو التطبيق بالأسفل، وسيتولّى Gemini توليد الصفحة كاملة ثم تظهر
            مباشرة في المعاينة الحية.
          </p>

          {onPickPrompt && (
            <div className="mt-5 space-y-1.5 text-right">
              {[
                'متجر إلكتروني عصري بشبكة منتجات وسلة تسوق',
                'صفحة هبوط لشركة برمجيات مع قسم أسعار',
                'لوحة تحكم تحليلات مع رسوم بيانية وجدول بيانات',
                'موقع شخصي لعرض الأعمال مع نموذج تواصل',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => onPickPrompt(example)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-right text-xs text-neutral-600 transition-all hover:border-orange-300 hover:bg-orange-50/50 hover:text-neutral-900"
                >
                  {example}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
      {messages.map((message) => {
        const isUser = message.role === 'user';
        return (
          <div key={message.id} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                isUser
                  ? 'bg-neutral-200 text-neutral-600'
                  : message.isError
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gradient-to-br from-orange-500 to-amber-500 text-white'
              }`}
            >
              {isUser ? (
                <User size={14} />
              ) : message.isError ? (
                <AlertTriangle size={14} />
              ) : (
                <Sparkles size={14} />
              )}
            </div>

            <div className={`min-w-0 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                  isUser
                    ? 'bg-neutral-900 text-white'
                    : message.isError
                      ? 'border border-red-200 bg-red-50 text-red-700'
                      : 'border border-neutral-200 bg-neutral-50 text-neutral-700'
                }`}
              >
                {message.content}
              </div>

              {message.status && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-orange-600">
                  <Loader2 size={11} className="animate-spin" />
                  {message.status}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isGenerating && (
        <div className="flex gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
            <Sparkles size={14} />
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-3">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}