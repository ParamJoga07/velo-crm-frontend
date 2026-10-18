import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

type ChatLink = { title: string; href: string };
type Msg = {
  role: 'user' | 'assistant';
  content: string;
  links?: ChatLink[];
};

type ChatResponse = {
  answer: string;
  links: ChatLink[];
  provider?: string;
};

type VoiceLang = 'en' | 'te';

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: {
    resultIndex: number;
    results: ArrayLike<{
      isFinal: boolean;
      0: { transcript: string };
    }>;
  }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const EXAMPLES = [
  { en: 'Show my new leads', te: 'నా కొత్త లీడ్స్ చూపించు' },
  { en: 'Any pending leave?', te: 'పెండింగ్ లీవ్ ఉందా?' },
];

const TELUGU_RE = /[\u0C00-\u0C7F]/;

function speechCtor(): (new () => SpeechRec) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function voiceFor(lang: VoiceLang) {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  if (lang === 'te') {
    return (
      voices.find((v) => v.lang.toLowerCase().startsWith('te')) ??
      voices.find((v) => v.lang.toLowerCase().includes('in')) ??
      null
    );
  }
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ??
    null
  );
}

function speakText(text: string, lang: VoiceLang) {
  if (!text.trim() || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === 'te' ? 'te-IN' : 'en-IN';
  const chosen = voiceFor(lang);
  if (chosen) utter.voice = chosen;
  utter.rate = 1;
  window.speechSynthesis.speak(utter);
}

export function AiChatWidget() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('en');
  const [listening, setListening] = useState(false);
  const [speakOn, setSpeakOn] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const listeningRef = useRef(false);
  const speakVoiceRef = useRef(false);
  const busyRef = useRef(false);

  useEffect(() => {
    setVoiceSupported(Boolean(speechCtor()));
    const loadVoices = () => {
      window.speechSynthesis?.getVoices?.();
    };
    loadVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices);
      window.speechSynthesis?.cancel();
      recRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }, []);

  const send = useCallback(
    async (raw: string, fromVoice = false) => {
      const message = raw.trim();
      if (!message || busyRef.current) return;
      stopListening();
      setText('');
      setError(null);
      speakVoiceRef.current = fromVoice;
      const nextHistory = [...messages, { role: 'user' as const, content: message }];
      setMessages(nextHistory);
      setBusy(true);
      try {
        const data = await apiFetch<ChatResponse>('/api/ai/chat', {
          method: 'POST',
          accessToken,
          body: JSON.stringify({
            message,
            history: nextHistory.slice(-8).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
        const answer = data.answer;
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: answer,
            links: data.links ?? [],
          },
        ]);
        if (speakOn && (fromVoice || speakVoiceRef.current) && answer) {
          speakText(answer, TELUGU_RE.test(answer) ? 'te' : voiceLang);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not reach the assistant');
      } finally {
        setBusy(false);
      }
    },
    [accessToken, messages, speakOn, stopListening, voiceLang],
  );

  const toggleListen = () => {
    if (listening) {
      stopListening();
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) {
      setError('Voice is not supported in this browser. Try Chrome or Safari.');
      return;
    }
    window.speechSynthesis?.cancel();
    const rec = new Ctor();
    rec.lang = voiceLang === 'te' ? 'te-IN' : 'en-IN';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (ev) => {
      let finalText = '';
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const row = ev.results[i];
        if (row.isFinal) finalText += row[0].transcript;
        else interim += row[0].transcript;
      }
      const shown = (finalText || interim).trim();
      if (shown) setText(shown);
      if (finalText.trim()) {
        stopListening();
        void send(finalText, true);
      }
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed') {
        setError('Microphone permission is blocked. Allow it in the browser and try again.');
      } else if (ev.error !== 'aborted' && ev.error !== 'no-speech') {
        setError('Could not hear that. Try again.');
      }
      stopListening();
    };
    rec.onend = () => {
      if (listeningRef.current) {
        listeningRef.current = false;
        setListening(false);
      }
    };
    recRef.current = rec;
    listeningRef.current = true;
    setError(null);
    setListening(true);
    try {
      rec.start();
    } catch {
      setError('Could not start the microphone.');
      stopListening();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };

  const closeChat = () => {
    stopListening();
    window.speechSynthesis?.cancel();
    setOpen(false);
  };

  return (
    <div className="pointer-events-none fixed bottom-[4.75rem] right-3 z-50 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open ? (
        <div className="pointer-events-auto flex h-[min(72vh,540px)] w-[min(calc(100vw-1.5rem),400px)] flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised/95 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-navy px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Velosphere AI</p>
                <p className="text-[11px] text-white/65">English · తెలుగు · voice</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="mr-1 flex rounded-md bg-white/10 p-0.5 text-[10px] font-semibold">
                <button
                  type="button"
                  className={cn(
                    'rounded px-1.5 py-0.5',
                    voiceLang === 'en' ? 'bg-white text-navy' : 'text-white/80',
                  )}
                  onClick={() => setVoiceLang('en')}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded px-1.5 py-0.5',
                    voiceLang === 'te' ? 'bg-white text-navy' : 'text-white/80',
                  )}
                  onClick={() => setVoiceLang('te')}
                >
                  తె
                </button>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-white/80 hover:bg-white/10"
                onClick={() => {
                  const next = !speakOn;
                  setSpeakOn(next);
                  if (!next) window.speechSynthesis?.cancel();
                }}
                aria-label={speakOn ? 'Mute spoken replies' : 'Unmute spoken replies'}
              >
                {speakOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                type="button"
                className="rounded-md p-1 text-white/80 hover:bg-white/10"
                onClick={closeChat}
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-3">
            {messages.length === 0 ? (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Ask by typing or tap the mic. I answer from this workspace and can open the related page.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.en}
                      type="button"
                      className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-navy hover:bg-surface-muted"
                      onClick={() => void send(ex.en)}
                    >
                      {ex.en}
                    </button>
                  ))}
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.te}
                      type="button"
                      className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-navy hover:bg-surface-muted"
                      onClick={() => void send(ex.te)}
                    >
                      {ex.te}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-muted text-navy',
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === 'assistant' ? (
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-navy"
                      onClick={() =>
                        speakText(m.content, TELUGU_RE.test(m.content) ? 'te' : voiceLang)
                      }
                    >
                      <Volume2 className="h-3 w-3" />
                      Play
                    </button>
                  ) : null}
                  {m.links?.length ? (
                    <div className="mt-2 flex flex-col gap-1">
                      {m.links.map((link) => (
                        <button
                          key={link.href}
                          type="button"
                          className="rounded-md bg-white/80 px-2 py-1 text-left text-xs font-medium text-primary hover:bg-white dark:bg-black/20"
                          onClick={() => {
                            closeChat();
                            navigate(link.href);
                          }}
                        >
                          Open {link.title} →
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Looking up your workspace…
              </div>
            ) : null}
            {listening ? (
              <p className="text-xs font-medium text-primary">
                Listening… speak in {voiceLang === 'te' ? 'Telugu' : 'English'}
              </p>
            ) : null}
            {error ? (
              <p className="text-xs text-danger">{error}</p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2 border-t border-border p-3"
          >
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(text);
                }
              }}
              placeholder={
                listening
                  ? 'Listening…'
                  : 'Ask in English or తెలుగు…'
              }
              className="max-h-24 min-h-10 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
            {voiceSupported ? (
              <button
                type="button"
                onClick={toggleListen}
                disabled={busy}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-md border disabled:opacity-40',
                  listening
                    ? 'border-danger bg-danger text-white'
                    : 'border-border bg-surface text-navy hover:bg-surface-muted',
                )}
                aria-label={listening ? 'Stop listening' : 'Speak'}
              >
                <Mic className={cn('h-4 w-4', listening && 'animate-pulse')} />
              </button>
            ) : null}
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (open) closeChat();
          else setOpen(true);
        }}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_40px_rgba(61,90,128,0.55)] transition-transform hover:scale-105"
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}
