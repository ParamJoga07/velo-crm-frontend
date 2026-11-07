import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';

type Props = {
  /** The page has everything it needs; the loader may finish and leave. */
  ready: boolean;
  /** Fires the moment the curtains start to lift, so the hero intro can begin underneath. */
  onReveal: () => void;
  /** Fires once the overlay is gone and can be unmounted. */
  onDone: () => void;
};

const WORDS = ['Leads', 'Pipeline', 'Attendance', 'Targets', 'One sphere'];

/**
 * Full-screen preloader: a counter climbs while the console "boots", then two
 * curtains sweep upward to reveal the hero. Progress is cosmetic up to 90% and
 * snaps to 100 once `ready` is true, with a short minimum so it never flickers.
 */
export function Preloader({ ready, onReveal, onDone }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [word, setWord] = useState(0);
  const [minElapsed, setMinElapsed] = useState(false);
  const exitedRef = useRef(false);
  const progress = useRef({ v: 0 });

  // Minimum on-screen time so the sequence reads as intentional.
  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), 2200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setWord((w) => (w + 1) % WORDS.length), 420);
    return () => window.clearInterval(t);
  }, []);

  // Climb to 90 while waiting.
  useLayoutEffect(() => {
    const el = counterRef.current;
    const bar = barRef.current;
    if (!el || !bar) return;
    const tween = gsap.to(progress.current, {
      v: 90,
      duration: 2.3,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = String(Math.round(progress.current.v)).padStart(2, '0');
        bar.style.transform = `scaleX(${progress.current.v / 100})`;
      },
    });
    return () => {
      tween.kill();
    };
  }, []);

  // Finish and exit.
  useLayoutEffect(() => {
    if (!ready || !minElapsed || exitedRef.current) return;
    exitedRef.current = true;
    const root = rootRef.current;
    const el = counterRef.current;
    const bar = barRef.current;
    if (!root || !el || !bar) {
      onReveal();
      onDone();
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tl = gsap.timeline({
      onComplete: () => onDone(),
    });
    tl.to(progress.current, {
      v: 100,
      duration: 0.5,
      ease: 'power3.inOut',
      onUpdate: () => {
        el.textContent = String(Math.round(progress.current.v)).padStart(2, '0');
        bar.style.transform = `scaleX(${progress.current.v / 100})`;
      },
    });
    if (reduce) {
      tl.to(root, { opacity: 0, duration: 0.3, onStart: onReveal });
      return () => {
        tl.kill();
      };
    }
    tl.to('[data-pre="content"]', { y: -30, opacity: 0, duration: 0.55, ease: 'power3.in' }, '-=0.1')
      .to('[data-pre="bar"]', { scaleX: 0, transformOrigin: 'right', duration: 0.5, ease: 'power3.in' }, '<')
      .add(() => onReveal(), '-=0.05')
      .to('[data-pre="front"]', { clipPath: 'inset(0 0 100% 0)', duration: 1.05, ease: 'expo.inOut' }, '<')
      .to('[data-pre="back"]', { clipPath: 'inset(0 0 100% 0)', duration: 1.05, ease: 'expo.inOut' }, '<0.14');
    return () => {
      tl.kill();
    };
  }, [ready, minElapsed, onReveal, onDone]);

  return (
    <div ref={rootRef} className="vs-pre" aria-hidden>
      <div data-pre="back" className="vs-pre-layer vs-pre-back" />
      <div data-pre="front" className="vs-pre-layer vs-pre-front">
        <div data-pre="content" className="vs-pre-content">
          <div className="vs-pre-mark">
            <img src="/velo-mark.png" alt="" />
          </div>
          <div className="vs-pre-counter">
            <span ref={counterRef} className="vs-mono">00</span>
            <span className="vs-pre-pct">%</span>
          </div>
          <div className="vs-pre-word">
            <span key={word} className="vs-pre-word-inner">
              {WORDS[word]}
            </span>
          </div>
        </div>
        <div className="vs-pre-track">
          <div ref={barRef} data-pre="bar" className="vs-pre-bar" />
        </div>
        <div className="vs-pre-foot">
          <span>VeloSphere CRM</span>
          <span className="vs-mono">booting console</span>
        </div>
      </div>
    </div>
  );
}
