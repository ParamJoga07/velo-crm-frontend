import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Calculator,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock,
  Database,
  FileCheck,
  GitBranch,
  KeyRound,
  ListChecks,
  Lock,
  MapPin,
  Menu,
  Palette,
  Phone,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Upload,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { PLAN_LIST } from '@velo/shared';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import {
  CountUp,
  EASE,
  Float,
  Item,
  Magnetic,
  Marquee,
  Reveal,
  SplitWords,
  Stagger,
  TiltCard,
  fadeIn,
  gsap,
  scaleIn,
  ScrollTrigger,
} from '@/components/landing/motion';
import { ThreeScene } from '@/components/landing/ThreeScene';
import { funnelScene, heroMotion, shieldScene, stackScene } from '@/components/landing/scenes';
import { globeScene } from '@/components/landing/globeScene';
import Lenis from 'lenis';
import { Preloader } from '@/components/landing/Preloader';
import './landing.css';


/* ---------------------------------------------------------------------------
 * Content
 * ------------------------------------------------------------------------- */

const NAV = [
  { href: '#modules', label: 'Product' },
  { href: '#pipeline', label: 'Pipeline' },
  { href: '#dashboard', label: 'Reports' },
  { href: '#hr', label: 'HR & Attendance' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#security', label: 'Security' },
];

type Module = {
  icon: typeof Users;
  title: string;
  body: string;
  tag: string;
  span?: 'wide' | 'tall';
  tone: 'blue' | 'indigo' | 'green' | 'amber' | 'teal' | 'rose';
};

const MODULES: Module[] = [
  {
    icon: ListChecks,
    title: 'Leads & pipeline',
    tag: 'Core',
    tone: 'blue',
    span: 'wide',
    body: 'Search, filter and sort every lead in the book. Custom fields, notes, a full activity timeline, follow-up tasks, campaign and project tags, Hot / Warm / Cold rating and structured lost reasons.',
  },
  {
    icon: GitBranch,
    title: 'Assignment & routing',
    tag: 'Automation',
    tone: 'indigo',
    body: 'Rules route new leads by source, project or campaign to the right team, then round-robin inside it. Managers bulk-reassign whole books in one click.',
  },
  {
    icon: Upload,
    title: 'Imports & exports',
    tag: 'Data',
    tone: 'teal',
    body: 'Excel / CSV intake with header-row detection and field mapping. Re-engage or reassign leads that already exist. Export jobs with history and a live quota balance.',
  },
  {
    icon: Phone,
    title: 'One-tap dialer',
    tag: 'Agent',
    tone: 'green',
    body: 'Dial from the lead card. Calls, WhatsApp, "did not pick" and "no action" are logged automatically, and DNP walks a lead down DNP 1 → 2 → 3 by itself.',
  },
  {
    icon: CalendarCheck,
    title: 'Follow-ups & tasks',
    tag: 'Agent',
    tone: 'amber',
    body: "Schedule reminders, see today's due list on the agent dashboard, complete tasks and keep the lead timeline honest.",
  },
  {
    icon: MapPin,
    title: 'Site visits & meetings',
    tag: 'Field',
    tone: 'rose',
    body: 'Register site visits and meetings, track booked / completed / cancelled, and resubmit when a visit slips.',
  },
  {
    icon: Target,
    title: 'Sales & targets',
    tag: 'Performance',
    tone: 'indigo',
    span: 'wide',
    body: 'Daily, weekly and monthly targets for calls, meetings, visits, sales and revenue. Log closed sales, see attainment per agent and per team, and spot who needs help before month-end.',
  },
  {
    icon: BarChart3,
    title: 'Reports & dashboard',
    tag: 'Manager',
    tone: 'blue',
    body: 'Funnel by stage, leads by source, team and owner, unassigned and missed follow-up counts, import health and the attendance snapshot.',
  },
  {
    icon: Clock,
    title: 'Attendance & leave',
    tag: 'HR',
    tone: 'green',
    body: 'Heartbeat check-in from the console or the app, clock in / out, half-day and full-day rules, weekly availability and leave approvals.',
  },
  {
    icon: Users,
    title: 'HRMS & documents',
    tag: 'HR',
    tone: 'teal',
    body: 'Employee profiles that exist before a CRM login is granted. Departments, teams and expiry-aware documents with request flows.',
  },
  {
    icon: Calculator,
    title: 'Payroll calculator',
    tag: 'HR',
    tone: 'amber',
    body: 'Turn attendance, half-days and approved leave into a monthly payroll sheet per employee.',
  },
  {
    icon: Sparkles,
    title: 'AI assistant',
    tag: 'New',
    tone: 'rose',
    body: 'Ask the console about your pipeline in plain language and get an answer grounded in your own data.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    tag: 'Everyone',
    tone: 'blue',
    body: 'In-app alerts for new assignments, follow-ups due, leave decisions and finished import jobs.',
  },
  {
    icon: Palette,
    title: 'White-label branding',
    tag: 'Tenant',
    tone: 'indigo',
    body: 'Your product name and primary / secondary / accent / sidebar colours across the whole workspace.',
  },
  {
    icon: Smartphone,
    title: 'Mobile app',
    tag: 'Field',
    tone: 'green',
    body: 'Same backend, same permissions. Agents work the book, dial, log visits and mark attendance from the field.',
  },
  {
    icon: ScrollText,
    title: 'Audit trail',
    tag: 'Compliance',
    tone: 'teal',
    body: 'Every stage change, reassignment, import and login leaves a record you can go back to.',
  },
];

const STAGES = [
  {
    key: 'INCOMING',
    label: 'Incoming',
    color: '#7FB6FF',
    body: 'Fresh from an import, a portal, an ad campaign or a walk-in. Unassigned until a rule or a manager routes it.',
  },
  {
    key: 'CONTACTED',
    label: 'Contacted',
    color: '#8B8CF5',
    body: 'First touch logged. The dialer, WhatsApp and notes all move a lead here automatically.',
  },
  {
    key: 'PROSPECT',
    label: 'Prospect',
    color: '#4FD1A5',
    body: 'Qualified. Only now does Hot / Warm / Cold rating unlock, so the rating always means something.',
  },
  {
    key: 'DNP',
    label: 'DNP 1 → 2 → 3',
    color: '#F3B24F',
    body: '"Did not pick" is a ladder, not a dead end. Each missed call steps the lead down; it stays in the book for retry.',
  },
  {
    key: 'WON',
    label: 'Won',
    color: '#5EE0C9',
    body: 'Booked. Counts toward the agent’s sales target and shows up in revenue attainment.',
  },
  {
    key: 'LOST',
    label: 'Lost',
    color: '#8A94A6',
    body: 'Closed with a reason: Not interested, Invalid number, Already invested or DNP exhausted. Reportable, never deleted.',
  },
];

const JOURNEY = [
  { icon: Upload, title: 'Capture', body: 'Import a sheet, post from a portal, or add by hand.' },
  { icon: GitBranch, title: 'Route', body: 'Assignment rules pick the team; round-robin picks the agent.' },
  { icon: Phone, title: 'Dial', body: 'One tap from the card. The outcome is logged for you.' },
  { icon: CalendarCheck, title: 'Follow up', body: 'Reminders land on the agent dashboard, due today.' },
  { icon: MapPin, title: 'Site visit', body: 'Register the visit; the manager sees it instantly.' },
  { icon: Target, title: 'Close', body: 'Mark Won. Targets, revenue and the funnel all update.' },
];

const LEADS = [
  { name: 'Rohit Nair', city: 'Pune', budget: '₹85L–1.1Cr', source: 'Housing.com', stage: 'Prospect', tone: 'green', owner: 'Ananya Iyer', updated: '12m', dot: '#A33B3B' },
  { name: 'Sneha Kulkarni', city: 'Mumbai', budget: '₹1.4–1.8Cr', source: '99acres', stage: 'Contacted', tone: 'indigo', owner: 'Vikram Shah', updated: '38m', dot: '#9A6700' },
  { name: 'Arjun Mehta', city: 'Bengaluru', budget: '₹72–90L', source: 'MagicBricks', stage: 'Incoming', tone: 'blue', owner: 'Priya Menon', updated: '1h', dot: '#A33B3B' },
  { name: 'Kavita Reddy', city: 'Hyderabad', budget: '₹55–68L', source: 'Walk-in', stage: 'Won', tone: 'teal', owner: 'Rahul Verma', updated: '2h', dot: '#9A6700' },
  { name: 'Imran Qureshi', city: 'Pune', budget: '₹95L–1.2Cr', source: 'Facebook Ads', stage: 'DNP 2', tone: 'amber', owner: 'Ananya Iyer', updated: '3h', dot: '#3D5A80' },
  { name: 'Deepa Joshi', city: 'Thane', budget: '₹48–60L', source: 'Referral', stage: 'Lost', tone: 'slate', owner: 'Vikram Shah', updated: '5h', dot: '#3D5A80' },
] as const;

const STAGE_PILL: Record<string, string> = {
  blue: 'bg-sky-500/15 text-sky-800',
  indigo: 'bg-indigo-500/15 text-indigo-800',
  green: 'bg-emerald-500/15 text-emerald-800',
  amber: 'bg-amber-500/15 text-amber-900',
  teal: 'bg-teal-500/15 text-teal-800',
  slate: 'bg-slate-500/15 text-slate-700',
};

const TONE: Record<Module['tone'], string> = {
  blue: 'vs-tone-blue',
  indigo: 'vs-tone-indigo',
  green: 'vs-tone-green',
  amber: 'vs-tone-amber',
  teal: 'vs-tone-teal',
  rose: 'vs-tone-rose',
};

const FAQ = [
  {
    q: 'Who is VeloSphere built for?',
    a: 'Real-estate developers, channel partners and brokerage sales floors in India. Everything is in INR, timestamps run in Asia/Kolkata, and the pipeline stages match how a property sales desk actually works.',
  },
  {
    q: 'How do leads get into the system?',
    a: 'Three ways: upload an Excel or CSV with field mapping, add a lead by hand from the console or the mobile app, or send them in from a portal or ad campaign. Every import is a job with a history, a status and a quota balance.',
  },
  {
    q: 'Can agents see each other’s leads?',
    a: 'No. Agents see their own book only. Managers see their team. Superadmins see the whole tenant. Scoping is enforced at every query on the server, not hidden in the UI.',
  },
  {
    q: 'What does attendance actually track?',
    a: 'A heartbeat from the console or the app marks presence; clock in / out and your tenant’s half-day and full-day thresholds decide the day’s status. Weekly availability, leave requests and approvals live in the same place, and payroll reads from it.',
  },
  {
    q: 'Can we use our own brand?',
    a: 'Yes. Set your product name and primary, secondary, accent and sidebar colours once and the whole workspace, including the mobile app, follows.',
  },
  {
    q: 'Is there a per-lead charge?',
    a: 'No. Plans are priced by seats and a monthly lead quota. Inside the quota there are no per-lead fees.',
  },
];

/* ---------------------------------------------------------------------------
 * Small pieces
 * ------------------------------------------------------------------------- */

let lenisRef: Lenis | null = null;

function scrollToId(id: string) {
  const el = document.getElementById(id.replace('#', ''));
  if (!el) return;
  if (lenisRef) lenisRef.scrollTo(el, { offset: -12, duration: 1.3 });
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function LogoMark({ light = false }: { light?: boolean }) {
  return (
    <img
      src="/velo-logo.png"
      alt="VeloSphere"
      className={cn('w-auto object-contain', light ? 'h-14' : 'h-11')}
    />
  );
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <div
      className={cn(
        'mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]',
        light ? 'text-[#94BCE3]' : 'text-[#3D5A80]',
      )}
    >
      <span className={cn('h-px w-6', light ? 'bg-[#94BCE3]' : 'bg-[#3D5A80]')} />
      {children}
    </div>
  );
}

function PrimaryLink({
  to,
  children,
  className,
  onClick,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span>{children}</span>
      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </>
  );
  if (to.startsWith('#')) {
    return (
      <a
        href={to}
        className={cn('vs-btn vs-btn-primary group gap-2', className)}
        onClick={(e) => {
          e.preventDefault();
          onClick?.();
          scrollToId(to);
        }}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link to={to} className={cn('vs-btn vs-btn-primary group gap-2', className)} onClick={onClick}>
      {inner}
    </Link>
  );
}

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="vs-faq">
      <button type="button" className="vs-faq-q" onClick={onToggle} aria-expanded={open}>
        <span>{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="vs-faq-a">{a}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [onDark, setOnDark] = useState(true);
  const [active, setActive] = useState<string>('product');
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const heroRef = useRef<HTMLElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLElement>(null);
  const bigLineRef = useRef<HTMLDivElement>(null);
  const settleRef = useRef<number>(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const onReveal = useCallback(() => setRevealed(true), []);
  const onLoaderDone = useCallback(() => setLoaderDone(true), []);

  // Everything the first paint needs: fonts and the logo. Lock scroll meanwhile.
  useEffect(() => {
    let alive = true;
    const fonts = 'fonts' in document ? document.fonts.ready : Promise.resolve();
    const logo = new Promise<void>((res) => {
      const img = new Image();
      img.onload = () => res();
      img.onerror = () => res();
      img.src = '/velo-logo.png';
    });
    Promise.all([fonts, logo]).then(() => {
      if (alive) setAssetsReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (loaderDone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [loaderDone]);

  // Smooth, inertial scrolling (Lenis) driven by GSAP's ticker so ScrollTrigger stays in sync.
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
    lenisRef = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef = null;
    };
  }, [reduce]);

  useEffect(() => {
    if (!lenisRef) return;
    if (loaderDone) lenisRef.start();
    else lenisRef.stop();
  }, [loaderDone]);
  const signInTo = user ? '/dashboard' : '/login';
  const signInLabel = user ? 'Open console' : 'Sign in';

  useEffect(() => {
    document.title = 'VeloSphere CRM — Pipeline, people and attendance in one console';
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const heroH = heroRef.current?.offsetHeight ?? 800;
      setOnDark(window.scrollY < heroH - 72);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) requestAnimationFrame(() => scrollToId(hash));
  }, []);

  // Track which section is in view so the nav pill follows the reader.
  useEffect(() => {
    const ids = ['product', ...NAV.map((n) => n.href.replace('#', ''))];
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.1, 0.3] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // GSAP: hero entrance (after the preloader lifts), hero parallax, pipeline scrub, journey line.
  useLayoutEffect(() => {
    if (reduce) {
      heroMotion.progress = 1;
      return;
    }
    if (!revealed) {
      // Hide hero copy until the curtain starts to lift.
      gsap.set('[data-hero="eyebrow"], [data-hero="line"], [data-hero="copy"], [data-hero="cta"], [data-hero="point"], [data-hero="chip"], [data-hero="stats"]', { opacity: 0 });
      gsap.set('[data-hero="visual"]', { opacity: 0, scale: 0.9 });
      return;
    }
    const ctx = gsap.context(() => {
      const hero = heroRef.current;
      if (hero) {
        const intro = gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .to(heroMotion, { progress: 1, duration: 2.6, ease: 'expo.out' }, 0)
          .to('[data-hero="visual"]', { opacity: 1, scale: 1, duration: 1.4, ease: 'expo.out' }, 0.1)
          .fromTo('[data-hero="eyebrow"]', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.45)
          .fromTo('[data-hero="line"]', { y: 56, opacity: 0, rotateX: -18 }, { y: 0, opacity: 1, rotateX: 0, duration: 1, stagger: 0.11 }, 0.55)
          .fromTo('[data-hero="copy"]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.95)
          .fromTo('[data-hero="cta"]', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08 }, 1.1)
          .fromTo('[data-hero="point"]', { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.1 }, 1.25)
          .fromTo('[data-hero="chip"]', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'back.out(1.6)' }, 1.5)
          .fromTo('[data-hero="stats"]', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 1.7);
        // If frames are throttled (background tab, slow device), never leave the copy hidden.
        const settle = window.setTimeout(() => intro.progress(1), 5000);
        settleRef.current = settle;

        gsap.fromTo('[data-hero="chips"]', { y: 0 }, {
          y: -70,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.fromTo('[data-hero="visual"]', { y: 0 }, {
          y: 60,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.fromTo(
          '[data-hero="line"], [data-hero="copy"], [data-hero="eyebrow"]',
          { y: 0, opacity: 1 },
          {
            y: -50,
            opacity: 0.25,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: { trigger: hero, start: '30% top', end: 'bottom top', scrub: true },
          },
        );
      }

      const pipe = pipelineRef.current;
      if (pipe) {
        gsap.fromTo(
          pipe.querySelector('[data-pipe="bar"]'),
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: { trigger: pipe, start: 'top 70%', end: 'bottom 55%', scrub: 0.4 },
          },
        );
        pipe.querySelectorAll<HTMLElement>('[data-pipe="stage"]').forEach((el) => {
          ScrollTrigger.create({
            trigger: el,
            start: 'top 68%',
            end: 'bottom 40%',
            toggleClass: { targets: el, className: 'is-lit' },
          });
        });
      }

      const journey = journeyRef.current;
      if (journey) {
        const track = journey.querySelector<HTMLElement>('[data-journey="track"]');
        const line = journey.querySelector<HTMLElement>('[data-journey="line"]');
        const mm = gsap.matchMedia();
        mm.add('(min-width: 1024px)', () => {
          if (!track) return;
          const distance = () => track.scrollWidth - window.innerWidth + 48;
          const tween = gsap.to(track, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: {
              trigger: journey,
              pin: true,
              scrub: 0.8,
              start: 'top top',
              end: () => '+=' + distance(),
              invalidateOnRefresh: true,
              anticipatePin: 1,
            },
          });
          if (line) {
            gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: journey, start: 'top top', end: () => '+=' + distance(), scrub: 0.8 } });
          }
          return () => tween.kill();
        });
        mm.add('(max-width: 1023px)', () => {
          if (line) gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: journey, start: 'top 70%', end: 'bottom 50%', scrub: 0.5 } });
        });
      }

      const big = bigLineRef.current;
      if (big) {
        gsap.fromTo(
          big.querySelector('[data-bigline]'),
          { xPercent: 4 },
          { xPercent: -36, ease: 'none', scrollTrigger: { trigger: big, start: 'top bottom', end: 'bottom top', scrub: 1 } },
        );
      }
    });
    return () => {
      window.clearTimeout(settleRef.current);
      ctx.revert();
    };
  }, [reduce, revealed]);

  return (
    <div className="vs-landing">
      {!loaderDone ? <Preloader ready={assetsReady} onReveal={onReveal} onDone={onLoaderDone} /> : null}
      <motion.header
        className={cn('vs-nav', scrolled && 'is-scrolled', onDark && 'is-dark')}
        initial={{ y: -24, opacity: 0 }}
        animate={revealed || reduce ? { y: 0, opacity: 1 } : { y: -24, opacity: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
      >
        <nav aria-label="Main" className="vs-nav-inner">
          <a
            href="#top"
            className="vs-nav-logo"
            onClick={(e) => {
              e.preventDefault();
              scrollToId('top');
            }}
          >
            <LogoMark />
          </a>
          <div className="vs-nav-links">
            {NAV.map((item) => {
              const id = item.href.replace('#', '');
              const isActive = active === id;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn('vs-nav-link', isActive && 'is-active')}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId(item.href);
                  }}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="vs-nav-pill"
                      className="vs-nav-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <span className="relative z-[1]">{item.label}</span>
                </a>
              );
            })}
          </div>
          <div className="vs-nav-actions">
            <Link to={signInTo} className="vs-nav-signin">
              {signInLabel}
            </Link>
            <PrimaryLink to="#cta" className="vs-hide-sm rounded-full px-4 py-2 text-[13px]">
              Book a demo
            </PrimaryLink>
            <button
              type="button"
              className="vs-nav-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              className="vs-mobile-menu"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="vs-mobile-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(false);
                    scrollToId(item.href);
                  }}
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4 opacity-40" />
                </a>
              ))}
              <div className="mt-2 flex gap-2 border-t border-[#E4EAF1] pt-3">
                <Link to={signInTo} className="vs-btn vs-btn-outline flex-1 px-4 py-2.5 text-sm">
                  {signInLabel}
                </Link>
                <PrimaryLink to="#cta" className="flex-1 px-4 py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                  Book a demo
                </PrimaryLink>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.header>

      <main id="top">
        {/* ------------------------------------------------------------ HERO */}
        <section ref={heroRef} id="product" className="vs-hero relative overflow-hidden">
          <div className="vs-hero-grid" aria-hidden />
          <div className="vs-hero-aurora" aria-hidden />
          <div className="vs-hero-fade" aria-hidden />

          <div className="vs-hero-content relative z-[2] mx-auto grid w-full max-w-[1240px] items-center gap-[clamp(24px,4vw,56px)] px-[clamp(20px,5vw,40px)] pt-[clamp(110px,14vw,150px)] lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
            <div className="relative z-[2] max-w-[600px]">
              <div
                data-hero="eyebrow"
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94BCE3] backdrop-blur"
              >
                <span className="vs-pulse-dot" />
                Real-estate sales console
              </div>

              <h1 className="vs-hero-h1 mb-6">
                <span data-hero="line" className="block">Every lead.</span>
                <span data-hero="line" className="block">Every agent.</span>
                <span data-hero="line" className="block">
                  <span className="vs-grad-text">One sphere.</span>
                </span>
              </h1>

              <p data-hero="copy" className="mb-8 max-w-[520px] text-[clamp(16px,1.25vw,18px)] leading-relaxed text-[#EEF0F2]/70">
                The CRM built for Indian real-estate sales floors. Import thousands of leads, route
                them by rule, dial from the card, track site visits and targets, and know who is on
                the floor, from one console and one mobile app.
              </p>

              <div className="mb-10 flex flex-wrap gap-3">
                <div data-hero="cta">
                  <Magnetic>
                    <PrimaryLink to="#cta" className="px-7 py-3.5 text-[15px]">
                      Book a live demo
                    </PrimaryLink>
                  </Magnetic>
                </div>
                <div data-hero="cta">
                  <Magnetic>
                    <Link to={signInTo} className="vs-btn vs-btn-ghost px-7 py-3.5 text-[15px]">
                      {signInLabel}
                    </Link>
                  </Magnetic>
                </div>
              </div>

              <div className="flex flex-col">
                {(
                  [
                    [Users, 'Team-scoped ownership', 'Managers assign, agents work their own book'],
                    [Upload, 'Import to pipeline', 'Excel / CSV intake with live quota balance'],
                    [ShieldCheck, 'Role-aware access', 'Superadmin, manager and agent views stay separate'],
                  ] as const
                ).map(([Icon, title, body]) => (
                  <div key={title} data-hero="point" className="flex items-start gap-3.5 border-t border-white/[0.1] py-3.5">
                    <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#94BCE3]" />
                    <p className="m-0 text-sm leading-normal text-[#EEF0F2]/70">
                      <strong className="font-semibold text-[#EEF0F2]">{title}</strong>
                      {' · '}
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="vs-hero-visual" data-hero="visual">
              <ThreeScene build={globeScene} className="vs-scene vs-scene-sphere" cameraZ={7.4} fov={36} />
              <div className="vs-hero-chips" data-hero="chips" aria-hidden>
                <Float className="vs-chip" style={{ top: '8%', left: '-8%' }} duration={5.5}>
                  <div data-hero="chip" className="vs-glass-chip">
                    <span className="vs-chip-label">Import · leads_nov.xlsx</span>
                    <span className="vs-mono vs-chip-value">2,480 rows mapped</span>
                    <span className="vs-chip-bar"><span style={{ width: '100%' }} /></span>
                  </div>
                </Float>
                <Float className="vs-chip" style={{ top: '20%', right: '-10%' }} duration={6.5} delay={0.8}>
                  <div data-hero="chip" className="vs-glass-chip">
                    <span className="vs-chip-label">Assignment rule</span>
                    <span className="vs-mono vs-chip-value text-[#9BE7C4]">Housing.com → Team Pune</span>
                  </div>
                </Float>
                <Float className="vs-chip" style={{ bottom: '14%', left: '-6%' }} duration={5} delay={1.4}>
                  <div data-hero="chip" className="vs-glass-chip">
                    <span className="vs-chip-label">Heartbeat</span>
                    <span className="vs-mono vs-chip-value">Ananya Iyer · present · 09:42</span>
                  </div>
                </Float>
                <Float className="vs-chip" style={{ bottom: '4%', right: '-6%' }} duration={6} delay={0.4}>
                  <div data-hero="chip" className="vs-glass-chip">
                    <span className="vs-chip-label">Site visit</span>
                    <span className="vs-mono vs-chip-value text-[#FFD48A]">Rohit Nair · Sat 11:00</span>
                  </div>
                </Float>
              </div>
            </div>
          </div>

          <div className="relative z-[2] mx-auto w-full max-w-[1240px] px-[clamp(20px,5vw,40px)]">
            <div className="vs-hero-stats" data-hero="stats">
              {(
                [
                  [250000, 'leads per tenant'],
                  [100, 'seats on Enterprise'],
                  [8, 'pipeline stages'],
                  [16, 'modules, one login'],
                ] as const
              ).map(([n, label]) => (
                <div key={label} className="vs-hero-stat">
                  <div className="vs-mono text-[clamp(22px,2.4vw,30px)] font-semibold text-[#EEF0F2]">
                    <CountUp to={n} duration={1.6} />
                  </div>
                  <div className="text-[12.5px] text-[#EEF0F2]/55">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- MARQUEE */}
        <section className="vs-strip">
          <Marquee speed={50}>
            {[
              'Leads & pipeline',
              'Assignment rules',
              'Excel / CSV imports',
              'One-tap dialer',
              'Follow-ups',
              'Site visits',
              'Sales targets',
              'Attendance',
              'Leave approvals',
              'HRMS',
              'Payroll',
              'Reports',
              'AI assistant',
              'White-label',
              'Mobile app',
              'Audit trail',
            ].map((t) => (
              <span key={t} className="vs-strip-item">
                <Zap className="h-3.5 w-3.5 text-[#3D5A80]" />
                {t}
              </span>
            ))}
          </Marquee>
        </section>

        {/* --------------------------------------------------------- MODULES */}
        <section id="modules" className="vs-sec-light px-6 py-[clamp(80px,10vw,128px)]">
          <div className="mx-auto max-w-[1240px]">
            <Reveal className="mb-14 max-w-[700px]">
              <Eyebrow>Everything the floor runs on</Eyebrow>
              <SplitWords
                as="h2"
                text="One console. Sixteen modules. Zero tools taped together."
                className="vs-h2 mb-4"
                highlight={['Sixteen', 'modules.']}
              />
              <p className="m-0 text-[17px] leading-relaxed text-[#6B7280]">
                Leads, routing, dialing, visits, targets, attendance, leave, HR, payroll and
                reporting share one database, one permission model and one login.
              </p>
            </Reveal>

            <Stagger className="vs-bento" delay={0.05}>
              {MODULES.map((m) => (
                <Item
                  key={m.title}
                  variants={scaleIn}
                  className={cn(m.span === 'wide' && 'vs-bento-wide')}
                >
                  <TiltCard className={cn('vs-card vs-module h-full p-6', TONE[m.tone])} max={6}>
                    <div className="mb-5 flex items-center justify-between">
                      <div className="vs-module-icon">
                        <m.icon className="h-[19px] w-[19px]" />
                      </div>
                      <span className="vs-module-tag">{m.tag}</span>
                    </div>
                    <h3 className="mb-2 text-[17px] font-semibold text-[#1C1F26]">{m.title}</h3>
                    <p className="m-0 text-[14px] leading-relaxed text-[#6B7280]">{m.body}</p>
                  </TiltCard>
                </Item>
              ))}
            </Stagger>
          </div>
        </section>

        {/* -------------------------------------------------------- PIPELINE */}
        <section id="pipeline" className="vs-sec-dark relative overflow-hidden px-6 py-[clamp(80px,10vw,128px)]">
          <div className="vs-dark-glow" aria-hidden />
          <div className="mx-auto grid max-w-[1240px] items-start gap-[clamp(32px,5vw,80px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-24">
              <Reveal>
                <Eyebrow light>Pipeline</Eyebrow>
                <SplitWords
                  as="h2"
                  text="Eight stages that match how a property desk really sells."
                  className="vs-h2 mb-4 text-[#E8EAEF]"
                  highlight={['Eight', 'stages']}
                />
                <p className="m-0 mb-8 max-w-[520px] text-[16px] leading-relaxed text-[#E8EAEF]/65">
                  Leads pour in at the top and narrow through contact, qualification and the
                  did-not-pick ladder. Nothing is deleted on the way down. Lost leads keep their
                  reason, so a manager can see exactly where the funnel leaks.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['Hot', 'rgba(244,63,94,0.16)', '#FDA4AF'],
                    ['Warm', 'rgba(249,115,22,0.16)', '#FDBA74'],
                    ['Cold', 'rgba(6,182,212,0.16)', '#67E8F9'],
                  ].map(([l, bg, fg]) => (
                    <span
                      key={l}
                      className="rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{ background: bg, color: fg }}
                    >
                      ● {l}
                    </span>
                  ))}
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-[#E8EAEF]/60">
                    Rating unlocks at Prospect
                  </span>
                </div>
              </Reveal>
              <Reveal className="vs-scene-wrap mt-10" variants={fadeIn} amount={0.1}>
                <ThreeScene build={funnelScene} className="vs-scene vs-scene-funnel" />
                <div className="vs-scene-caption">
                  <span className="vs-mono">live</span> leads moving through stages; grey ones fall out as Lost
                </div>
              </Reveal>
            </div>

            <div ref={pipelineRef} className="vs-stages relative">
              <div className="vs-stage-rail" aria-hidden>
                <div data-pipe="bar" className="vs-stage-bar" />
              </div>
              {STAGES.map((s, i) => (
                <div
                  key={s.key}
                  data-pipe="stage"
                  className="vs-stage"
                  style={{ ['--stage' as string]: s.color }}
                >
                  <div className="vs-stage-dot" />
                  <div className="vs-stage-body">
                    <div className="mb-1 flex items-center gap-3">
                      <span className="vs-mono text-[11px] text-[#E8EAEF]/40">0{i + 1}</span>
                      <h3 className="m-0 text-[20px] font-semibold text-[#E8EAEF]">{s.label}</h3>
                    </div>
                    <p className="m-0 text-[15px] leading-relaxed text-[#E8EAEF]/60">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- BIG LINE */}
        <div ref={bigLineRef} className="vs-bigline" aria-hidden>
          <div data-bigline className="vs-bigline-track">
            {['Leads', 'Routing', 'Dialer', 'Site visits', 'Targets', 'Attendance', 'Payroll', 'Reports'].map((t) => (
              <span key={t}>
                {t}
                <i />
              </span>
            ))}
          </div>
        </div>

        {/* --------------------------------------------------------- JOURNEY */}
        <section ref={journeyRef} className="vs-sec-light vs-journey-sec">
          <div className="vs-journey-pin">
            <div className="mx-auto w-full max-w-[1240px] px-6">
              <Reveal className="vs-journey-head">
                <Eyebrow>A lead&apos;s day</Eyebrow>
                <SplitWords
                  as="h2"
                  text="From spreadsheet to site visit in six moves."
                  className="vs-h2 mb-3"
                  highlight={['six', 'moves.']}
                />
                <p className="m-0 max-w-[560px] text-[16px] leading-relaxed text-[#6B7280]">
                  Every step writes to the same timeline, so a manager can replay what happened to
                  any lead, and an agent never has to ask what to do next.
                  <span className="vs-journey-hint"> Keep scrolling →</span>
                </p>
              </Reveal>
            </div>
            <div data-journey="track" className="vs-journey-track">
              <div className="vs-journey-progress" aria-hidden>
                <div data-journey="line" className="vs-journey-line" />
              </div>
              {JOURNEY.map((j, i) => (
                <div key={j.title} className="vs-journey-card">
                  <div className="vs-journey-num vs-mono">0{i + 1}</div>
                  <div className="vs-journey-node">
                    <j.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 mt-5 text-[22px] font-semibold tracking-tight text-[#1C1F26]">{j.title}</h3>
                  <p className="m-0 text-[15px] leading-relaxed text-[#6B7280]">{j.body}</p>
                  <div className="vs-journey-ghost" aria-hidden>{j.title}</div>
                </div>
              ))}
              <div className="vs-journey-card vs-journey-card-end">
                <div className="vs-journey-num vs-mono">✓</div>
                <h3 className="mb-2 mt-5 text-[22px] font-semibold tracking-tight text-[#E8EAEF]">Won.</h3>
                <p className="m-0 mb-5 text-[15px] leading-relaxed text-[#E8EAEF]/65">
                  Targets, revenue and the funnel all update the moment the agent marks it.
                </p>
                <PrimaryLink to="#cta" className="px-5 py-2.5 text-sm">Book a demo</PrimaryLink>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- PREVIEW */}
        <section id="preview" className="vs-sec-alt px-[clamp(20px,4vw,56px)] py-[clamp(64px,8vw,96px)]">
          <div className="mx-auto w-full max-w-[1040px]">
            <Reveal className="mb-8 text-center">
              <Eyebrow>Live console preview</Eyebrow>
              <h2 className="vs-h2 m-0">Your team&apos;s book, at a glance</h2>
            </Reveal>
            <Reveal variants={scaleIn} amount={0.2}>
              <TiltCard max={3} className="vs-card vs-console overflow-hidden" glare={false}>
                <div className="vs-console-bar">
                  <span className="flex gap-1.5">
                    <i style={{ background: '#FF5F57' }} />
                    <i style={{ background: '#FEBC2E' }} />
                    <i style={{ background: '#28C840' }} />
                  </span>
                  <span className="vs-mono text-[11px] text-[#6B7280]">velospherecrm.com/leads</span>
                  <span />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4EAF1] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-semibold text-[#1C1F26]">Leads · My team</span>
                    <span className="vs-mono rounded-full bg-[#E4EAF1] px-2 py-0.5 text-[10.5px] text-[#2C4260]">
                      1,204
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Stage: all', 'Priority: all', 'Source: all', 'Owner: team'].map((f) => (
                      <span key={f} className="vs-filter">{f}</span>
                    ))}
                  </div>
                </div>
                <div className="hidden grid-cols-[1.35fr_0.75fr_1.05fr_1fr_0.95fr_0.95fr_0.6fr] gap-2 border-b border-[#E4EAF1] bg-[#F7F8FA] px-4 py-2 sm:grid">
                  {['Lead', 'City', 'Budget', 'Source', 'Stage', 'Owner', 'Updated'].map((h) => (
                    <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">
                      {h}
                    </span>
                  ))}
                </div>
                <Stagger delay={0.06}>
                  {LEADS.map((lead) => (
                    <Item
                      key={lead.name}
                      variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } } }}
                      className="vs-row grid grid-cols-1 items-center gap-2 border-b border-[#EDF0F3] px-4 py-2.5 sm:grid-cols-[1.35fr_0.75fr_1.05fr_1fr_0.95fr_0.95fr_0.6fr]"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: lead.dot }} />
                        <span className="truncate text-[12.5px] font-semibold text-[#1C1F26]">{lead.name}</span>
                      </span>
                      <span className="text-xs text-[#6B7280]">{lead.city}</span>
                      <span className="vs-mono whitespace-nowrap text-[11.5px] text-[#1C1F26]">{lead.budget}</span>
                      <span className="truncate text-xs text-[#6B7280]">{lead.source}</span>
                      <span>
                        <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold', STAGE_PILL[lead.tone])}>
                          {lead.stage}
                        </span>
                      </span>
                      <span className="truncate text-xs text-[#1C1F26]">{lead.owner}</span>
                      <span className="vs-mono text-[11px] text-[#6B7280]">{lead.updated}</span>
                    </Item>
                  ))}
                </Stagger>
                <div className="flex justify-between bg-[#F7F8FA] px-4 py-2.5">
                  <span className="text-[11px] text-[#6B7280]">Showing 6 of 1,204 · sorted by last update</span>
                  <span className="vs-mono text-[11px] font-semibold text-[#2C4260]">Page 1 / 201</span>
                </div>
              </TiltCard>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------- DASHBOARD */}
        <section id="dashboard" className="vs-sec-light px-6 py-[clamp(80px,10vw,120px)]">
          <div
            className="mx-auto grid max-w-[1240px] items-center gap-[clamp(32px,5vw,72px)]"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))' }}
          >
            <Reveal>
              <Eyebrow>Reports & performance</Eyebrow>
              <SplitWords
                as="h2"
                text="Managers see the floor, not a spreadsheet."
                className="vs-h2 mb-4"
                highlight={['floor,']}
              />
              <p className="mb-6 text-[16px] leading-relaxed text-[#6B7280]">
                The dashboard answers the morning questions before anyone asks them. Targets turn
                activity into a number per agent, per day, week and month.
              </p>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {[
                  'Funnel by stage, with conversion between stages',
                  'Leads by source, team and owner',
                  'Unassigned leads and missed follow-ups',
                  'Calls, meetings, visits, sales and revenue vs target',
                  'Import job health and quota burn',
                  'Attendance snapshot for today',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-[15px] leading-normal text-[#4B5563]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2F6F4E]" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal variants={scaleIn}>
              <div className="mb-3 grid grid-cols-3 gap-3">
                {(
                  [
                    ['Unassigned', 214, '#1C1F26'],
                    ['Won this month', 88, '#2F6F4E'],
                    ['Missed f/ups', 37, '#A33B3B'],
                  ] as const
                ).map(([label, value, color]) => (
                  <TiltCard key={label} className="vs-card px-4 py-3.5" max={5}>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">{label}</div>
                    <div className="vs-mono mt-1 text-[24px] font-semibold" style={{ color }}>
                      <CountUp to={value} />
                    </div>
                  </TiltCard>
                ))}
              </div>
              <TiltCard className="vs-card p-[18px]" max={3}>
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold text-[#1C1F26]">Leads by source · this week</span>
                  <span className="vs-mono text-[11px] text-[#6B7280]">W45</span>
                </div>
                <div className="flex h-[130px] items-end gap-3.5 px-1">
                  {(
                    [
                      [612, 100, '#3D5A80', 'Housing'],
                      [487, 80, '#5877A0', '99acres'],
                      [340, 56, '#7A9BBF', 'MagicBricks'],
                      [228, 37, '#A9BED4', 'Meta'],
                      [104, 17, '#CBD6E2', 'Walk-in'],
                    ] as const
                  ).map(([n, h, bg, label], i) => (
                    <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="vs-mono text-[10px] text-[#6B7280]">{n}</span>
                      <motion.div
                        className="w-full max-w-[44px] origin-bottom rounded-t-[4px]"
                        style={{ height: h, background: bg }}
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: EASE }}
                      />
                      <span className="text-[10px] text-[#6B7280]">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-[#EDF0F3] pt-3.5">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-[#6B7280]">
                    <span>Team target · calls this week</span>
                    <span className="vs-mono font-semibold text-[#1C1F26]">1,120 / 1,500</span>
                  </div>
                  <div className="h-[6px] overflow-hidden rounded-full bg-[#E4EAF1]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#3D5A80] to-[#5EE0C9]"
                      initial={{ width: 0 }}
                      whileInView={{ width: '74.6%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
                    />
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------- HR */}
        <section id="hr" className="vs-sec-alt px-6 py-[clamp(80px,10vw,120px)]">
          <div
            className="mx-auto grid max-w-[1240px] items-center gap-[clamp(32px,5vw,72px)]"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))' }}
          >
            <Reveal variants={scaleIn} className="order-2 lg:order-1">
              <TiltCard className="vs-card p-5" max={4}>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1C1F26]">Attendance · today</span>
                  <span className="vs-mono text-[11px] text-[#6B7280]">Fri 07 Nov · IST</span>
                </div>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {(
                    [
                      ['Present', 41, 'rgba(47,111,78,0.1)', '#2F6F4E'],
                      ['Half-day', 6, 'rgba(154,103,0,0.1)', '#9A6700'],
                      ['Absent', 3, 'rgba(163,59,59,0.1)', '#A33B3B'],
                    ] as const
                  ).map(([l, n, bg, fg]) => (
                    <div key={l} className="rounded-lg px-3 py-2.5" style={{ background: bg }}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: fg }}>{l}</div>
                      <div className="vs-mono text-[20px] font-semibold" style={{ color: fg }}>
                        <CountUp to={n} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      ['Ananya Iyer', 'Clocked in 09:42', 'present', 'Heartbeat 2m ago'],
                      ['Vikram Shah', 'Clocked in 10:58', 'half', 'Late check-in'],
                      ['Priya Menon', 'On leave', 'leave', 'Approved by R. Verma'],
                      ['Rahul Verma', 'Clocked in 09:05', 'present', 'In the field · app'],
                    ] as const
                  ).map(([name, status, kind, note]) => (
                    <div key={name} className="flex items-center gap-3 rounded-lg border border-[#EDF0F3] px-3 py-2">
                      <span className={cn('vs-hb', kind === 'present' && 'is-live', kind === 'half' && 'is-half', kind === 'leave' && 'is-leave')} />
                      <span className="flex-1 text-[13px] font-medium text-[#1C1F26]">{name}</span>
                      <span className="text-[12px] text-[#6B7280]">{status}</span>
                      <span className="vs-mono hidden text-[10.5px] text-[#9CA3AF] sm:inline">{note}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#EDF0F3] pt-3.5 text-[11px] text-[#6B7280]">
                  <span>Leave requests</span>
                  <span className="vs-mono rounded-full bg-[#E4EAF1] px-2 py-0.5 font-semibold text-[#2C4260]">2 pending</span>
                  <span className="ml-auto">Payroll preview ready</span>
                  <Calculator className="h-3.5 w-3.5 text-[#3D5A80]" />
                </div>
              </TiltCard>
            </Reveal>
            <Reveal className="order-1 lg:order-2">
              <Eyebrow>HR, attendance & payroll</Eyebrow>
              <SplitWords
                as="h2"
                text="Know who is on the floor, and pay them from the same record."
                className="vs-h2 mb-4"
                highlight={['floor,']}
              />
              <p className="mb-6 text-[16px] leading-relaxed text-[#6B7280]">
                Attendance is not a separate app. A heartbeat from the console or the mobile app
                marks presence; your tenant&apos;s half-day and full-day thresholds decide the status.
                Leave, documents and payroll all read from the same employee record.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    [Clock, 'Heartbeat check-in', 'Presence from the console or app, clock in / out, half & full-day rules.'],
                    [CalendarCheck, 'Leave & availability', 'Weekly availability calendar, leave requests and one-click approvals.'],
                    [FileCheck, 'Documents', 'Expiry-aware employee documents with request and upload flows.'],
                    [Calculator, 'Payroll calculator', 'Monthly payroll sheet per employee from attendance and leave.'],
                  ] as const
                ).map(([Icon, t, b]) => (
                  <div key={t} className="flex gap-3">
                    <div className="vs-mini-icon"><Icon className="h-4 w-4" /></div>
                    <div>
                      <div className="text-[14px] font-semibold text-[#1C1F26]">{t}</div>
                      <div className="text-[13px] leading-relaxed text-[#6B7280]">{b}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ----------------------------------------------------------- ROLES */}
        <section className="vs-sec-light px-6 py-[clamp(80px,10vw,120px)]">
          <div className="mx-auto max-w-[1240px]">
            <Reveal className="mb-12 max-w-[640px]">
              <Eyebrow>Roles</Eyebrow>
              <SplitWords as="h2" text="Every seat sees exactly its job." className="vs-h2 m-0" highlight={['exactly']} />
            </Reveal>
            <Stagger className="grid gap-5 md:grid-cols-3" delay={0.12}>
              {(
                [
                  [Building2, 'Superadmin', 'Owns the tenant', ['Org, plans and branding', 'Users, teams and departments', 'Impersonation for support', 'Every team’s data', 'Company profile: PAN, GST, RERA', 'Purge and bulk operations']],
                  [Users, 'Manager', 'Runs the floor', ['Team book and pipeline', 'Assignment rules and reassign', 'Imports and exports', 'Targets and performance', 'Leave approvals', 'Attendance records']],
                  [User, 'Agent', 'Works the book', ['My leads and open tasks', 'Follow-ups due today', 'Dialer, notes and activities', 'Site visits and meetings', 'My attendance and leave', 'Mobile app in the field']],
                ] as const
              ).map(([Icon, title, sub, items]) => (
                <Item key={title} variants={scaleIn}>
                  <TiltCard className="vs-card vs-role h-full p-7" max={6}>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="vs-module-icon"><Icon className="h-5 w-5" /></div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1C1F26]">{title}</div>
                        <div className="text-[12px] text-[#6B7280]">{sub}</div>
                      </div>
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[14px] leading-normal text-[#4B5563]">
                      {items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#3D5A80]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </TiltCard>
                </Item>
              ))}
            </Stagger>
          </div>
        </section>

        {/* -------------------------------------------------------- SECURITY */}
        <section id="security" className="vs-sec-dark relative overflow-hidden px-6 py-[clamp(80px,10vw,128px)]">
          <div className="vs-dark-glow" aria-hidden />
          <div className="mx-auto grid max-w-[1240px] items-center gap-[clamp(32px,5vw,72px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Reveal className="vs-scene-wrap order-2 lg:order-1" variants={fadeIn} amount={0.1}>
              <ThreeScene build={shieldScene} className="vs-scene vs-scene-shield" />
            </Reveal>
            <div className="order-1 lg:order-2">
              <Reveal>
                <Eyebrow light>Security & tenancy</Eyebrow>
                <SplitWords
                  as="h2"
                  text="One tenant per company. One role per view."
                  className="vs-h2 mb-4 text-[#E8EAEF]"
                  highlight={['One']}
                />
                <p className="m-0 mb-10 max-w-[520px] text-[16px] leading-relaxed text-[#E8EAEF]/65">
                  Data separation is enforced in the product, not promised in a slide. Every query
                  carries the tenant and the role; the UI never gets a chance to leak.
                </p>
              </Reveal>
              <Stagger className="grid gap-6 sm:grid-cols-2" delay={0.1}>
                {(
                  [
                    [Database, 'Isolated tenant', 'Each company runs in its own tenant; cross-tenant access is tested end to end.'],
                    [KeyRound, 'JWT access', 'Short-lived access tokens with httpOnly refresh cookies.'],
                    [Lock, 'Role-scoped data', 'Superadmin, manager and agent scopes applied at every query.'],
                    [ScrollText, 'Audit log', 'Stage changes, reassignments, imports and logins are recorded.'],
                    [FileCheck, 'Company profile', 'PAN, GST and RERA stored on the tenant record.'],
                    [ShieldCheck, 'Backed up & hosted in-region', 'Managed Postgres with automated backups.'],
                  ] as const
                ).map(([Icon, title, body]) => (
                  <Item key={title} className="flex gap-3.5">
                    <div className="vs-mini-icon vs-mini-icon-dark"><Icon className="h-4 w-4" /></div>
                    <p className="m-0 text-sm leading-relaxed text-[#E8EAEF]/[0.65]">
                      <strong className="mb-1 block font-semibold text-[#E8EAEF]">{title}</strong>
                      {body}
                    </p>
                  </Item>
                ))}
              </Stagger>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- PRICING */}
        <section id="pricing" className="vs-sec-light px-6 py-[clamp(80px,10vw,128px)]">
          <div className="mx-auto max-w-[1240px]">
            <Reveal className="mb-12 max-w-[640px]">
              <Eyebrow>Pricing</Eyebrow>
              <SplitWords as="h2" text="Priced by seats and lead quota. Nothing per lead." className="vs-h2 mb-4" highlight={['Nothing', 'per', 'lead.']} />
              <p className="m-0 text-[16px] leading-relaxed text-[#6B7280]">
                Monthly, in INR. Every plan includes company branding, attendance, leave and HRMS.
              </p>
            </Reveal>
            <Stagger className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] items-stretch gap-5" delay={0.1}>
              {PLAN_LIST.map((plan) => {
                const recommended = plan.code === 'TEAM_30';
                return (
                  <Item key={plan.code} variants={scaleIn}>
                    <TiltCard className={cn('vs-card vs-plan flex h-full flex-col p-7', recommended && 'is-recommended')} max={5}>
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-[15px] font-semibold text-[#1C1F26]">{plan.name}</span>
                        {recommended ? <span className="vs-module-tag">Most popular</span> : null}
                      </div>
                      <div className="mb-1">
                        <span className="vs-mono text-[32px] font-semibold text-[#1C1F26]">
                          ₹{plan.priceInrMonthly.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[13px] text-[#6B7280]">/mo</span>
                      </div>
                      <div className="mb-6 text-[13px] text-[#6B7280]">{plan.tagline}</div>
                      <div className="mb-6 grid grid-cols-2 gap-3 rounded-lg bg-[#F7F8FA] p-3">
                        <div>
                          <div className="vs-mono text-[18px] font-semibold text-[#1C1F26]">{plan.seatLimit}</div>
                          <div className="text-[11px] text-[#6B7280]">seats</div>
                        </div>
                        <div>
                          <div className="vs-mono text-[18px] font-semibold text-[#1C1F26]">{plan.leadLimit.toLocaleString('en-IN')}</div>
                          <div className="text-[11px] text-[#6B7280]">lead quota</div>
                        </div>
                      </div>
                      <ul className="m-0 mb-7 flex flex-1 list-none flex-col gap-2 p-0">
                        {plan.features.map((f) => (
                          <li key={f} className="flex gap-2 text-[13.5px] text-[#4B5563]">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2F6F4E]" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <a
                        href="#cta"
                        className={cn('vs-btn px-4 py-2.5 text-center text-sm', recommended ? 'vs-btn-primary' : 'vs-btn-outline vs-btn-outline-fill')}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollToId('cta');
                        }}
                      >
                        Book a demo
                      </a>
                    </TiltCard>
                  </Item>
                );
              })}
            </Stagger>
            <Reveal>
              <p className="mb-0 mt-7 max-w-[760px] text-[13.5px] leading-relaxed text-[#6B7280]">
                Higher tiers add imports, exports, bulk reassign, full white-label, priority support
                and dedicated onboarding. Need more than 100 seats? Talk to us.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------- FAQ */}
        <section className="vs-sec-alt px-6 py-[clamp(72px,9vw,112px)]">
          <div className="mx-auto grid max-w-[1240px] gap-[clamp(24px,4vw,64px)] lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <Eyebrow>Questions</Eyebrow>
              <h2 className="vs-h2 mb-3">Straight answers.</h2>
              <p className="m-0 text-[15px] leading-relaxed text-[#6B7280]">
                If it is not here, book a demo and ask us live. We will show you the actual console
                on your own sample sheet.
              </p>
            </Reveal>
            <Reveal variants={fadeIn} className="flex flex-col gap-2">
              {FAQ.map((f, i) => (
                <FaqItem
                  key={f.q}
                  q={f.q}
                  a={f.a}
                  open={faqOpen === i}
                  onToggle={() => setFaqOpen(faqOpen === i ? null : i)}
                />
              ))}
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------- CTA */}
        <section id="cta" className="vs-sec-dark relative overflow-hidden px-6 py-[clamp(96px,12vw,150px)] text-center">
          <ThreeScene build={stackScene} className="vs-scene vs-scene-cta" cameraZ={8.4} />
          <div className="vs-dark-glow" aria-hidden />
          <div className="vs-cta-backdrop" aria-hidden />
          <Reveal className="relative z-[2] mx-auto max-w-[720px]">
            <Eyebrow light>Get started</Eyebrow>
            <SplitWords
              as="h2"
              text="Put your whole sales floor in one console."
              className="vs-h2 mb-5 text-[clamp(30px,4vw,48px)] text-[#E8EAEF]"
              highlight={['one', 'console.']}
            />
            <p className="mx-auto mb-9 max-w-[520px] text-[16px] leading-relaxed text-[#E8EAEF]/65">
              Bring a lead sheet. We will import it live, route it to a team and show you the
              dashboard your managers will open every morning.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Magnetic>
                <PrimaryLink to={signInTo} className="px-7 py-3 text-[15px]">
                  {user ? 'Open console' : 'Book a demo'}
                </PrimaryLink>
              </Magnetic>
              <Magnetic>
                <Link to={signInTo} className="vs-btn vs-btn-ghost px-7 py-3 text-[15px]">
                  {signInLabel}
                </Link>
              </Magnetic>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="bg-[#14161B] px-6 pb-10 pt-[clamp(56px,7vw,80px)]">
        <div className="mx-auto max-w-[1240px]">
          <div className="mb-14 grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-10">
            <div>
              <div className="mb-4">
                <span className="vs-foot-logo">
                  <LogoMark light />
                </span>
              </div>
              <p className="m-0 text-[13px] leading-relaxed text-[#E8EAEF]/[0.55]">
                Enterprise real-estate lead CRM: assignment, attendance and pipeline control in
                one workspace.
              </p>
            </div>
            <div>
              <div className="vs-foot-h">Product</div>
              <div className="flex flex-col gap-2 text-[13.5px]">
                {(
                  [
                    ['#modules', 'Modules'],
                    ['#pipeline', 'Pipeline'],
                    ['#dashboard', 'Reports & targets'],
                    ['#hr', 'HR & attendance'],
                    ['#pricing', 'Pricing'],
                    ['#security', 'Security'],
                  ] as const
                ).map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    className="vs-foot-link"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToId(href);
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <div className="vs-foot-h">Company</div>
              <div className="flex flex-col gap-2 text-[13.5px]">
                <a href="/" className="vs-foot-link">velospherecrm.com</a>
                <a
                  href="#cta"
                  className="vs-foot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId('cta');
                  }}
                >
                  Book a demo
                </a>
                <Link to={signInTo} className="vs-foot-link">{signInLabel}</Link>
              </div>
            </div>
            <div>
              <div className="vs-foot-h">Legal</div>
              <div className="flex flex-col gap-2 text-[13.5px] text-[#E8EAEF]/[0.45]">
                <span>Privacy policy</span>
                <span>Terms of service</span>
                <span>Refund policy</span>
              </div>
            </div>
            <div>
              <div className="vs-foot-h">Contact</div>
              <div className="flex flex-col gap-2 text-[13.5px] text-[#E8EAEF]/[0.72]">
                <span>Sales · book a demo</span>
                <span className="vs-mono text-[12.5px]">Asia/Kolkata (IST)</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-4 border-t border-white/[0.08] pt-6 text-[12.5px] text-[#E8EAEF]/[0.45]">
            <span>© 2026 VeloSphere CRM. All rights reserved.</span>
            <span>Operating hours and timestamps in Asia/Kolkata.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
