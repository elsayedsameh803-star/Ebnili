import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, Sparkles, X } from 'lucide-react';
import type { Template } from '@/lib/types';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  streamStatus: string;
  selectedTemplate: Template | null;
  onClearTemplate: () => void;
}

/**
 * Bottom-docked composer (Bolt.new style): grows with the text, keeps the
 * selected template as a removable chip, and submits with Enter.
 */
export default function PromptInput({
  onGenerate,
  isGenerating,
  streamStatus,
  selectedTemplate,
  onClearTemplate,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [prompt]);

  const submit = () => {
    const value = prompt.trim();
    if (!value || isGenerating) return;
    onGenerate(value);
    setPrompt('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const hasTemplate = Boolean(selectedTemplate && selectedTemplate.category !== 'blank');

  return (
    <div className="border-t border-neutral-200 bg-white px-4 py-3">
      {hasTemplate && (
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
            <Sparkles size={11} />
            {selectedTemplate?.name}
          </span>
          <button
            onClick={onClearTemplate}
            className="rounded-full p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            title="إزالة القالب"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="relative rounded-2xl border border-neutral-200 bg-neutral-50 transition-all focus-within:border-orange-400 focus-within:bg-white focus-within:shadow-sm">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isGenerating ? 'جارٍ التوليد...' : 'صف الموقع أو التطبيق الذي تريد بناءه...'}
          rows={1}
          disabled={isGenerating}
          className="max-h-[180px] w-full resize-none bg-transparent px-4 py-3 pb-11 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none disabled:opacity-60"
        />

        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between">
          <span className="text-[10px] text-neutral-400">Enter للإرسال · Shift+Enter لسطر جديد</span>
          <button
            onClick={submit}
            disabled={!prompt.trim() || isGenerating}
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white transition-all hover:bg-orange-500 disabled:opacity-30 disabled:hover:bg-neutral-900"
            title="توليد"
          >
            {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />}
          </button>
        </div>
      </div>

      {isGenerating && streamStatus && (
        <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-orange-600">
          <Loader2 size={11} className="animate-spin" />
          {streamStatus}
        </div>
      )}
    </div>
  );
}