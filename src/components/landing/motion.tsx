import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const stagger = (delay = 0.08, start = 0.05): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: start } },
});

type RevealProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
  variants?: Variants;
  delay?: number;
  amount?: number;
  as?: 'div' | 'section' | 'li' | 'p' | 'span';
};

/** Fades + lifts content in the first time it scrolls into view. */
export function Reveal({
  children,
  className,
  id,
  style,
  variants = fadeUp,
  delay = 0,
  amount = 0.2,
  as = 'div',
}: RevealProps) {
  const Tag = motion[as];
  return (
    <Tag
      id={id}
      className={className}
      style={style}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      transition={{ delay }}
    >
      {children}
    </Tag>
  );
}

/** Container whose direct `Item` children animate in sequence. */
export function Stagger({
  children,
  className,
  id,
  delay = 0.08,
  start = 0.05,
  amount = 0.15,
  style,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  start?: number;
  amount?: number;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      id={id}
      className={className}
      style={style}
      variants={stagger(delay, start)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}

export function Item({
  children,
  className,
  style,
  variants = fadeUp,
  id,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variants?: Variants;
  id?: string;
}) {
  return (
    <motion.div id={id} className={className} style={style} variants={variants}>
      {children}
    </motion.div>
  );
}

/** Card that tilts toward the pointer in 3D with a moving glare highlight. */
export function TiltCard({
  children,
  className,
  style,
  max = 8,
  glare = true,
  id,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  max?: number;
  glare?: boolean;
  id?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 220, damping: 22 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 220, damping: 22 });
  const glareX = useTransform(px, [0, 1], ['0%', '100%']);
  const glareY = useTransform(py, [0, 1], ['0%', '100%']);
  const glareBg = useTransform(
    [glareX, glareY],
    ([x, y]) =>
      `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.22), rgba(255,255,255,0) 55%)`,
  );
  const [hover, setHover] = useState(false);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reduce) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
    setHover(false);
  };

  return (
    <motion.div
      id={id}
      ref={ref}
      className={cn('vs-tilt', className)}
      style={{
        ...style,
        rotateX: reduce ? 0 : rx,
        rotateY: reduce ? 0 : ry,
        transformStyle: 'preserve-3d',
        transformPerspective: 1000,
      }}
      onMouseMove={onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={onLeave}
      whileHover={reduce ? undefined : { y: -4, transition: { duration: 0.25 } }}
    >
      {children}
      {glare ? (
        <motion.span
          aria-hidden
          className="vs-tilt-glare"
          style={{ opacity: hover ? 1 : 0, background: glareBg }}
        />
      ) : null}
    </motion.div>
  );
}

/** Button wrapper that leans toward the pointer. */
export function Magnetic({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={cn('inline-flex', className)}
      style={{ x, y }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}

/** Number that counts up from 0 when scrolled into view (GSAP). */
export function CountUp({
  to,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
  duration = 1.8,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) =>
      `${prefix}${v.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      el.textContent = fmt(to);
      return;
    }
    const obj = { v: 0 };
    el.textContent = fmt(0);
    const tween = gsap.to(obj, {
      v: to,
      duration,
      ease: 'power3.out',
      paused: true,
      onUpdate: () => {
        el.textContent = fmt(obj.v);
      },
    });
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => tween.play(),
    });
    return () => {
      st.kill();
      tween.kill();
    };
  }, [to, prefix, suffix, decimals, duration]);
  return <span ref={ref} className={className} />;
}

/** Headline whose words rise in one by one. */
export function SplitWords({
  text,
  className,
  delay = 0,
  as: Tag = 'h2',
  highlight,
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  /** Words (exact match) rendered with the accent gradient. */
  highlight?: string[];
}) {
  const words = text.split(' ');
  const Comp = motion[Tag];
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: delay } } }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="vs-word" aria-hidden>
          <motion.span
            className={cn('vs-word-inner', highlight?.includes(w.replace(/[.,]/g, '')) && 'vs-grad-text')}
            variants={{
              hidden: { y: '110%', opacity: 0, rotateX: -30 },
              show: { y: 0, opacity: 1, rotateX: 0, transition: { duration: 0.7, ease: EASE } },
            }}
          >
            {w}
          </motion.span>
        </span>
      )).reduce<ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ' ', el]), [])}
    </Comp>
  );
}

/** Infinite horizontal marquee powered by GSAP, pauses on hover. */
export function Marquee({
  children,
  className,
  speed = 60,
  reverse = false,
}: {
  children: ReactNode;
  className?: string;
  /** pixels per second */
  speed?: number;
  reverse?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const half = track.scrollWidth / 2;
    if (!half) return;
    const tween = gsap.fromTo(
      track,
      { x: reverse ? -half : 0 },
      { x: reverse ? 0 : -half, duration: half / speed, ease: 'none', repeat: -1 },
    );
    const onEnter = () => tween.timeScale(0.25);
    const onLeave = () => tween.timeScale(1);
    track.addEventListener('mouseenter', onEnter);
    track.addEventListener('mouseleave', onLeave);
    return () => {
      tween.kill();
      track.removeEventListener('mouseenter', onEnter);
      track.removeEventListener('mouseleave', onLeave);
    };
  }, [speed, reverse]);
  return (
    <div className={cn('vs-marquee', className)}>
      <div ref={trackRef} className="vs-marquee-track">
        {children}
        {children}
      </div>
    </div>
  );
}

/** Soft floating motion for decorative chips. */
export function Float({
  children,
  className,
  style,
  amplitude = 8,
  duration = 5,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  amplitude?: number;
  duration?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={style}
      animate={reduce ? undefined : { y: [0, -amplitude, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

export { gsap, ScrollTrigger, motion };
