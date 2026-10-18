import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const KEY = 'velo-welcome';

export function greetingFor(name: string, at = new Date()) {
  const hour = at.getHours();
  const first = name.trim().split(/\s+/)[0] || 'there';
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1;
  utter.lang = 'en-IN';
  window.speechSynthesis.speak(utter);
}

export function WelcomeGreeting({ name }: { name: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const pending = sessionStorage.getItem(KEY);
    if (!pending) return;
    sessionStorage.removeItem(KEY);
    const line = greetingFor(name);
    setText(line);
    speak(line);
    const t = window.setTimeout(() => setText(null), 8000);
    return () => window.clearTimeout(t);
  }, [name]);

  if (!text) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
      <span>{text}. Welcome back.</span>
      <button
        type="button"
        className="rounded p-1 hover:bg-white/15"
        aria-label="Dismiss"
        onClick={() => setText(null)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
