import { lazy, Suspense, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Clock,
  Database,
  FileCheck,
  GitBranch,
  KeyRound,
  ListChecks,
  Lock,
  Menu,
  Palette,
  ShieldCheck,
  Smartphone,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

const LandingHero3D = lazy(() =>
  import('@/components/LandingHero3D').then((m) => ({ default: m.LandingHero3D })),
);
import { cn } from '@/lib/utils';
import './landing.css';

const LEADS = [
  {
    name: 'Rohit Nair',
    city: 'Pune',
    budget: '₹85L–1.1Cr',
    source: 'Housing.com',
    stage: 'Opportunity',
    stBg: '#E4EAF1',
    stFg: '#2C4260',
    owner: 'Ananya Iyer',
    updated: '12m',
    dot: '#A33B3B',
  },
  {
    name: 'Sneha Kulkarni',
    city: 'Mumbai',
    budget: '₹1.4–1.8Cr',
    source: '99acres',
    stage: 'Prospect',
    stBg: '#EDF0F3',
    stFg: '#4B5563',
    owner: 'Vikram Shah',
    updated: '38m',
    dot: '#9A6700',
  },
  {
    name: 'Arjun Mehta',
    city: 'Bengaluru',
    budget: '₹72–90L',
    source: 'MagicBricks',
    stage: 'Incoming',
    stBg: '#EDF0F3',
    stFg: '#4B5563',
    owner: 'Priya Menon',
    updated: '1h',
    dot: '#A33B3B',
  },
  {
    name: 'Kavita Reddy',
    city: 'Hyderabad',
    budget: '₹55–68L',
    source: 'Walk-in',
    stage: 'Booked',
    stBg: 'rgba(47,111,78,0.12)',
    stFg: '#2F6F4E',
    owner: 'Rahul Verma',
    updated: '2h',
    dot: '#9A6700',
  },
  {
    name: 'Imran Qureshi',
    city: 'Pune',
    budget: '₹95L–1.2Cr',
    source: 'Facebook Ads',
    stage: 'Opportunity',
    stBg: '#E4EAF1',
    stFg: '#2C4260',
    owner: 'Ananya Iyer',
    updated: '3h',
    dot: '#3D5A80',
  },
  {
    name: 'Deepa Joshi',
    city: 'Thane',
    budget: '₹48–60L',
    source: 'Referral',
    stage: 'Lost',
    stBg: 'rgba(163,59,59,0.1)',
    stFg: '#A33B3B',
    owner: 'Vikram Shah',
    updated: '5h',
    dot: '#3D5A80',
  },
];

const PLANS = [
  { name: 'Team 15', price: '₹9,999', seats: '15', leads: '25,000', recommended: false },
  { name: 'Team 30', price: '₹19,999', seats: '30', leads: '50,000', recommended: true },
  { name: 'Team 50', price: '₹34,999', seats: '50', leads: '100,000', recommended: false },
  {
    name: 'Enterprise 75+',
    price: '₹59,999',
    seats: '100',
    leads: '250,000',
    recommended: false,
  },
];

const NAV = [
  { href: '#product', label: 'Product' },
  { href: '#pipeline', label: 'Pipeline' },
  { href: '#hr', label: 'HR & Attendance' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#security', label: 'Security' },
];

function scrollToId(id: string) {
  const el = document.getElementById(id.replace('#', ''));
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Reveal({
  children,
  className,
  id,
  style,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
}) {
  return (
    <div id={id} data-reveal className={cn('vs-reveal', className)} style={style}>
      {children}
    </div>
  );
}

function LogoMark({ light = false }: { light?: boolean }) {
  return (
    <img
      src="/velo-logo.png"
      alt="VeloSphere"
      className={cn('w-auto object-contain', light ? 'h-14' : 'h-12')}
    />
  );
}

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-[#E4EAF1] text-[#3D5A80]">
      {children}
    </div>
  );
}

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const signInTo = user ? '/dashboard' : '/login';
  const signInLabel = user ? 'Open console' : 'Sign in';

  useEffect(() => {
    document.title = 'Velosphere';
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) requestAnimationFrame(() => scrollToId(hash));
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (reduce) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    let stagger = 0;
    let last = 0;
    const io = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        if (now - last > 300) stagger = 0;
        last = now;
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const delay = stagger;
          stagger += 60;
          window.setTimeout(() => el.classList.add('is-in'), delay);
          io.unobserve(el);
        });
      },
      { threshold: 0.1 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="vs-landing">
      <header className={cn('vs-nav', scrolled && 'is-scrolled')}>
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-6"
        >
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToId('top');
            }}
          >
            <LogoMark />
          </a>
          <div className="vs-nav-links flex gap-[26px] text-sm font-medium">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[#1C1F26] hover:text-[#3D5A80]"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId(item.href);
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <Link to={signInTo} className="vs-btn vs-btn-outline px-4 py-2 text-sm">
              {signInLabel}
            </Link>
            <a
              href="#cta"
              className="vs-btn vs-btn-primary vs-hide-sm px-4 py-2 text-sm"
              onClick={(e) => {
                e.preventDefault();
                scrollToId('cta');
              }}
            >
              Book a demo
            </a>
            <button
              type="button"
              className="vs-nav-toggle flex h-9 w-9 items-center justify-center rounded-md text-[#1C1F26]"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        {menuOpen ? (
          <div className="vs-mobile-menu border-t border-[#D5DAE1] bg-white px-6 py-4">
            <div className="flex flex-col gap-3 text-sm font-medium">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-[#1C1F26]"
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(false);
                    scrollToId(item.href);
                  }}
                >
                  {item.label}
                </a>
              ))}
              <Link to={signInTo} className="vs-btn vs-btn-primary px-4 py-2 text-sm">
                {signInLabel}
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main id="top">
        <section id="product" className="vs-hero relative min-h-[100svh] overflow-hidden">
          <div className="vs-hero-grid" aria-hidden />
          <Suspense fallback={null}>
            <LandingHero3D className="vs-hero3d-bg" />
          </Suspense>
          <div className="vs-hero-content relative mx-auto grid min-h-[100svh] w-full max-w-[1240px] items-center px-[clamp(24px,5vw,40px)] pb-[clamp(48px,6vw,70px)] pt-[clamp(96px,12vw,130px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <Reveal className="relative z-[2] max-w-[560px]">
              <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94BCE3]">
                Operations Console
              </div>
              <h1 className="mb-5 text-[clamp(34px,4.2vw,54px)] font-bold leading-[1.08] tracking-tight text-[#EEF0F2]">
                Pipeline, people, and attendance in one CRM.
              </h1>
              <p className="mb-8 max-w-[480px] text-base leading-relaxed text-[#EEF0F2]/70">
                Built for real-estate sales floors. Import thousands of leads,
                assign by team, and see who is working — without leaving the
                console.
              </p>
              <div className="mb-11 flex flex-wrap gap-3">
                <a
                  href="#cta"
                  className="vs-btn vs-btn-primary px-6 py-3 text-[15px]"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId('cta');
                  }}
                >
                  Book a demo
                </a>
                <Link to={signInTo} className="vs-btn vs-btn-ghost px-6 py-3 text-[15px]">
                  {signInLabel}
                </Link>
              </div>
              <div className="flex flex-col">
                {(
                  [
                    [Users, 'Team-scoped lead ownership', 'Managers assign, agents work their book'],
                    [Upload, 'Import to pipeline', 'Batch intake with live balance tracking'],
                    [
                      ShieldCheck,
                      'Role-aware access',
                      'Admin, manager and agent views stay separated',
                    ],
                  ] as const
                ).map(([Icon, title, body]) => (
                  <div
                    key={title}
                    className="flex items-start gap-3.5 border-t border-white/[0.1] py-3.5"
                  >
                    <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#94BCE3]" />
                    <p className="m-0 text-sm leading-normal text-[#EEF0F2]/70">
                      <strong className="font-semibold text-[#EEF0F2]">{title}</strong>
                      {' · '}
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section
          id="preview"
          className="border-b border-[#D5DAE1] bg-[#F7F8FA] px-[clamp(20px,4vw,56px)] py-[clamp(40px,5vw,64px)]"
        >
          <Reveal className="mx-auto w-full max-w-[960px]">
            <div className="mb-6 text-center">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                Live console preview
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#1C1F26]">
                Your team&apos;s lead pipeline at a glance
              </h2>
            </div>
            <div className="relative z-[2] mb-[-10px] flex flex-wrap justify-center gap-3.5 px-3">
                <div className="vs-card min-w-[200px] flex-1 px-4 py-3">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                      Lead balance
                    </span>
                    <span className="vs-mono text-xs font-semibold text-[#1C1F26]">
                      18,420 / 25,000
                    </span>
                  </div>
                  <div className="h-[5px] overflow-hidden rounded-[3px] bg-[#E4EAF1]">
                    <div className="h-full w-[73.7%] rounded-[3px] bg-[#3D5A80]" />
                  </div>
                </div>
                <div className="vs-card flex items-center gap-2.5 px-4 py-3">
                  <div className="flex h-[26px] items-end gap-[3px]">
                    <div className="h-[26px] w-[7px] rounded-[1px] bg-[#3D5A80]" />
                    <div className="h-[18px] w-[7px] rounded-[1px] bg-[#7A9BBF]" />
                    <div className="h-[11px] w-[7px] rounded-[1px] bg-[#A9BED4]" />
                    <div className="h-1.5 w-[7px] rounded-[1px] bg-[#2F6F4E]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                      Funnel
                    </div>
                    <div className="vs-mono text-xs font-semibold text-[#1C1F26]">
                      7,192 open
                    </div>
                  </div>
                </div>
              </div>
              <div className="vs-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#D5DAE1] px-4 py-3.5">
                  <span className="text-[13px] font-semibold text-[#1C1F26]">
                    Leads · My team
                  </span>
                  <span className="vs-mono text-[11px] text-[#6B7280]">6 of 1,204</span>
                </div>
                <div className="hidden grid-cols-[1.35fr_0.75fr_1.05fr_1fr_0.95fr_0.95fr_0.6fr] gap-2 border-b border-[#D5DAE1] bg-[#F7F8FA] px-4 py-2 sm:grid">
                  {['Lead', 'City', 'Budget', 'Source', 'Stage', 'Owner', 'Updated'].map(
                    (h) => (
                      <span
                        key={h}
                        className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]"
                      >
                        {h}
                      </span>
                    ),
                  )}
                </div>
                {LEADS.map((lead) => (
                  <div
                    key={lead.name}
                    className="grid grid-cols-1 items-center gap-2 border-b border-[#EDF0F3] px-4 py-2.5 sm:grid-cols-[1.35fr_0.75fr_1.05fr_1fr_0.95fr_0.95fr_0.6fr]"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-[7px] w-[7px] shrink-0 rounded-full"
                        style={{ background: lead.dot }}
                      />
                      <span className="truncate text-[12.5px] font-semibold text-[#1C1F26]">
                        {lead.name}
                      </span>
                    </span>
                    <span className="text-xs text-[#6B7280]">{lead.city}</span>
                    <span className="vs-mono whitespace-nowrap text-[11.5px] text-[#1C1F26]">
                      {lead.budget}
                    </span>
                    <span className="truncate text-xs text-[#6B7280]">{lead.source}</span>
                    <span>
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                        style={{ background: lead.stBg, color: lead.stFg }}
                      >
                        {lead.stage}
                      </span>
                    </span>
                    <span className="truncate text-xs text-[#1C1F26]">{lead.owner}</span>
                    <span className="vs-mono text-[11px] text-[#6B7280]">{lead.updated}</span>
                  </div>
                ))}
                <div className="flex justify-between bg-[#F7F8FA] px-4 py-2.5">
                  <span className="text-[11px] text-[#6B7280]">
                    Filtered · Stage: all · Priority: all
                  </span>
                  <span className="vs-mono text-[11px] font-semibold text-[#2C4260]">
                    Page 1 / 201
                  </span>
                </div>
              </div>
          </Reveal>
        </section>

        <section
          id="pipeline"
          className="border-b border-[#D5DAE1] bg-[#F1F3F5] px-6 py-9"
        >
          <Reveal className="mx-auto max-w-[1200px]">
            <div className="flex flex-wrap items-center gap-2">
              {[
                ['Incoming', '4,210', false],
                ['Prospect', '1,930', false],
                ['Opportunity', '842', false],
                ['Booked', '212', true],
              ].map(([label, count, booked], i) => (
                <div key={String(label)} className="flex items-center gap-2">
                  {i > 0 ? <span className="text-[#6B7280]">→</span> : null}
                  <div
                    className={cn(
                      'rounded-md border bg-white px-[18px] py-2.5 text-center',
                      booked ? 'border-[#3D5A80]' : 'border-[#D5DAE1]',
                    )}
                  >
                    <div
                      className={cn(
                        'text-xs font-semibold',
                        booked ? 'text-[#2C4260]' : 'text-[#1C1F26]',
                      )}
                    >
                      {label}
                    </div>
                    <div
                      className={cn(
                        'vs-mono text-xs',
                        booked ? 'font-semibold text-[#2F6F4E]' : 'text-[#6B7280]',
                      )}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              ))}
              <div className="ml-3 flex flex-wrap gap-2">
                <span className="rounded-md bg-[#E9ECEF] px-3 py-[5px] text-[11.5px] font-medium text-[#6B7280]">
                  Unqualified · <span className="vs-mono">396</span>
                </span>
                <span className="rounded-md bg-[#E9ECEF] px-3 py-[5px] text-[11.5px] font-medium text-[#6B7280]">
                  Lost · <span className="vs-mono">518</span>
                </span>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <span className="rounded-full bg-[rgba(163,59,59,0.1)] px-3 py-1 text-[11px] font-semibold text-[#A33B3B]">
                  ● Hot
                </span>
                <span className="rounded-full bg-[rgba(154,103,0,0.1)] px-3 py-1 text-[11px] font-semibold text-[#9A6700]">
                  ● Warm
                </span>
                <span className="rounded-full bg-[#E4EAF1] px-3 py-1 text-[11px] font-semibold text-[#2C4260]">
                  ● Cold
                </span>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="border-b border-[#D5DAE1] bg-[#F7F8FA] px-6 py-[clamp(56px,6vw,80px)]">
          <Reveal className="mx-auto max-w-[1200px] text-center">
            <p className="mb-9 text-[15px] text-[#6B7280]">
              Built for developers, channel partners and brokerage sales floors.
            </p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-6">
              {[
                ['250,000', 'leads per tenant'],
                ['100', 'seats'],
                ['6', 'pipeline stages'],
                ['Asia/Kolkata', 'native timezone'],
              ].map(([stat, label]) => (
                <div key={label}>
                  <div className="vs-mono text-[clamp(24px,2.6vw,32px)] font-semibold text-[#1C1F26]">
                    {stat}
                  </div>
                  <div className="mt-1 text-[13px] text-[#6B7280]">{label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="bg-[#F1F3F5] px-6 py-[clamp(72px,9vw,112px)]">
          <div className="mx-auto max-w-[1200px]">
            <Reveal className="mb-12 max-w-[620px]">
              <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D5A80]">
                Modules
              </div>
              <h2 className="mb-3.5 text-[clamp(26px,3vw,36px)] font-bold tracking-tight text-[#1C1F26]">
                The console owns the whole floor.
              </h2>
              <p className="m-0 text-base leading-relaxed text-[#6B7280]">
                Leads, assignment, imports, attendance and HR live in one
                workspace — not five tools taped together.
              </p>
            </Reveal>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
              {(
                [
                  [
                    ListChecks,
                    'Leads & pipeline',
                    'Search, filters, custom fields, notes, activities, follow-ups, campaign and project on every lead, lost reasons.',
                  ],
                  [
                    GitBranch,
                    'Assignment rules',
                    'Route by source, project or campaign to a team; round-robin strategies; bulk reassign for managers.',
                  ],
                  [
                    Upload,
                    'Imports & exports',
                    'Excel/CSV intake with field mapping and header row, re-engage or reassign existing leads, export jobs, live quota balance.',
                  ],
                  [
                    Clock,
                    'Attendance',
                    'Heartbeat check-in, present / half-day / full-day rules, weekly availability calendar, leave requests and approvals.',
                    'hr',
                  ],
                  [
                    Users,
                    'HRMS',
                    'Employee profiles that exist before a CRM login is granted, departments, teams, expiry-aware documents.',
                  ],
                  [
                    Palette,
                    'White-label',
                    'Your product name and primary/secondary/accent/sidebar colours across the tenant.',
                  ],
                ] as [typeof Users, string, string, string?][]
              ).map(([Icon, title, body, id]) => (
                <Reveal key={title} id={id} className="vs-card vs-card-lift p-[26px]">
                  <FeatureIcon>
                    <Icon className="h-[19px] w-[19px]" />
                  </FeatureIcon>
                  <h3 className="mb-2 text-base font-semibold text-[#1C1F26]">{title}</h3>
                  <p className="m-0 text-sm leading-relaxed text-[#6B7280]">{body}</p>
                </Reveal>
              ))}
            </div>
            <Reveal className="vs-card mt-5 flex flex-wrap items-start gap-5 p-[26px]">
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-[#E4EAF1] text-[#3D5A80]">
                <Smartphone className="h-[19px] w-[19px]" />
              </div>
              <div className="min-w-[260px] flex-1">
                <h3 className="mb-2 text-base font-semibold text-[#1C1F26]">
                  Mobile app for agents
                </h3>
                <p className="m-0 max-w-[720px] text-sm leading-relaxed text-[#6B7280]">
                  Same backend, same data. Agents work their book, log follow-ups
                  and mark attendance from the field.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-y border-[#D5DAE1] bg-[#F7F8FA] px-6 py-[clamp(72px,9vw,112px)]">
          <div
            className="mx-auto grid max-w-[1200px] items-center gap-[clamp(32px,5vw,72px)]"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
            }}
          >
            <Reveal>
              <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D5A80]">
                Dashboard
              </div>
              <h2 className="mb-4 text-[clamp(26px,3vw,36px)] font-bold tracking-tight text-[#1C1F26]">
                Managers see the floor, not a spreadsheet.
              </h2>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {[
                  'Funnel by stage',
                  'Leads by source, team and owner',
                  'Unassigned and missed follow-up counts',
                  'Import job health',
                  'Attendance snapshot',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[15px] leading-normal text-[#6B7280]"
                  >
                    <span className="font-bold text-[#3D5A80]">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal>
              <div className="mb-3 grid grid-cols-3 gap-3">
                {[
                  ['Unassigned', '214', '#1C1F26'],
                  ['Booked', '88', '#2F6F4E'],
                  ['Missed f/ups', '37', '#A33B3B'],
                ].map(([label, value, color]) => (
                  <div key={label} className="vs-card px-4 py-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {label}
                    </div>
                    <div
                      className="vs-mono mt-1 text-[22px] font-semibold"
                      style={{ color }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="vs-card p-[18px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(28,31,38,0.06)]">
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold text-[#1C1F26]">
                    Leads by source · this week
                  </span>
                  <span className="vs-mono text-[11px] text-[#6B7280]">W37</span>
                </div>
                <div className="flex h-[120px] items-end gap-3.5 px-1">
                  {[
                    ['612', 88, '#3D5A80', 'Housing'],
                    ['487', 70, '#5877A0', '99acres'],
                    ['340', 49, '#7A9BBF', 'MagicBricks'],
                    ['228', 33, '#A9BED4', 'Meta'],
                    ['104', 15, '#CBD6E2', 'Walk-in'],
                  ].map(([n, h, bg, label]) => (
                    <div
                      key={label}
                      className="flex flex-1 flex-col items-center gap-1.5"
                    >
                      <span className="vs-mono text-[10px] text-[#6B7280]">{n}</span>
                      <div
                        className="w-full max-w-[44px] rounded-t-[3px]"
                        style={{ height: Number(h), background: String(bg) }}
                      />
                      <span className="text-[10px] text-[#6B7280]">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#EDF0F3] pt-3.5">
                  <span className="mr-1 text-[11px] text-[#6B7280]">Attendance today</span>
                  <span className="vs-mono rounded-full bg-[rgba(47,111,78,0.1)] px-2.5 py-0.5 text-[11px] font-semibold text-[#2F6F4E]">
                    Present 41
                  </span>
                  <span className="vs-mono rounded-full bg-[rgba(154,103,0,0.1)] px-2.5 py-0.5 text-[11px] font-semibold text-[#9A6700]">
                    Half-day 6
                  </span>
                  <span className="vs-mono rounded-full bg-[rgba(163,59,59,0.1)] px-2.5 py-0.5 text-[11px] font-semibold text-[#A33B3B]">
                    Absent 3
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bg-[#F1F3F5] px-6 py-[clamp(72px,9vw,112px)]">
          <div className="mx-auto max-w-[1200px]">
            <Reveal className="mb-12 max-w-[620px]">
              <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D5A80]">
                Roles
              </div>
              <h2 className="m-0 text-[clamp(26px,3vw,36px)] font-bold tracking-tight text-[#1C1F26]">
                Every seat sees exactly its job.
              </h2>
            </Reveal>
            <div
              className="grid"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              }}
            >
              {(
                [
                  [
                    Building2,
                    'Superadmin',
                    [
                      'Org, plans and branding',
                      'Tenant management',
                      'Impersonation for support',
                      "Every team's data",
                      'Company profile and billing',
                    ],
                    'pr-[clamp(16px,3vw,40px)]',
                  ],
                  [
                    Users,
                    'Manager',
                    [
                      'Team book and pipeline',
                      'Assignment and reassignment',
                      'Imports and exports',
                      'Leave approvals',
                      'Team performance',
                    ],
                    'px-[clamp(16px,3vw,40px)]',
                  ],
                  [
                    User,
                    'Agent',
                    [
                      'My leads and open tasks',
                      'Follow-ups due today',
                      'Notes and activities',
                      'My attendance',
                      'Mobile app in the field',
                    ],
                    'pl-[clamp(16px,3vw,40px)]',
                  ],
                ] as const
              ).map(([Icon, title, items, pad], i, arr) => (
                <Reveal
                  key={title}
                  className={cn(
                    'vs-role-col py-2',
                    pad,
                    i < arr.length - 1 && 'border-r border-[#D5DAE1]',
                  )}
                >
                  <div className="mb-4 flex items-center gap-2.5">
                    <Icon className="h-5 w-5 text-[#3D5A80]" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1C1F26]">
                      {title}
                    </span>
                  </div>
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm leading-normal text-[#6B7280]">
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="border-t border-[#D5DAE1] bg-[#F7F8FA] px-6 py-[clamp(72px,9vw,112px)]"
        >
          <div className="mx-auto max-w-[1200px]">
            <Reveal className="mb-12 max-w-[620px]">
              <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D5A80]">
                Pricing
              </div>
              <h2 className="mb-3.5 text-[clamp(26px,3vw,36px)] font-bold tracking-tight text-[#1C1F26]">
                Priced by seats and lead quota.
              </h2>
              <p className="m-0 text-base leading-relaxed text-[#6B7280]">
                Monthly, in INR. No per-lead charges inside your quota.
              </p>
            </Reveal>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] items-stretch gap-5">
              {PLANS.map((plan) => (
                <Reveal
                  key={plan.name}
                  className="vs-card vs-card-lift flex flex-col p-[26px]"
                  style={
                    plan.recommended
                      ? { borderTop: '3px solid #3D5A80' }
                      : undefined
                  }
                >
                  <div className="mb-[18px] flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#1C1F26]">
                      {plan.name}
                    </span>
                    {plan.recommended ? (
                      <span className="rounded bg-[#E4EAF1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2C4260]">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                  <div className="mb-[18px]">
                    <span className="vs-mono text-[28px] font-semibold text-[#1C1F26]">
                      {plan.price}
                    </span>
                    <span className="text-[13px] text-[#6B7280]">/mo</span>
                  </div>
                  <div className="mb-6 flex flex-1 flex-col gap-2">
                    <div className="text-[13.5px] text-[#6B7280]">
                      <span className="vs-mono font-semibold text-[#1C1F26]">
                        {plan.seats}
                      </span>{' '}
                      seats
                    </div>
                    <div className="text-[13.5px] text-[#6B7280]">
                      <span className="vs-mono font-semibold text-[#1C1F26]">
                        {plan.leads}
                      </span>{' '}
                      leads
                    </div>
                  </div>
                  <a
                    href="#cta"
                    className="vs-btn vs-btn-outline vs-btn-outline-fill px-4 py-2.5 text-center text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToId('cta');
                    }}
                  >
                    Book a demo
                  </a>
                </Reveal>
              ))}
            </div>
            <Reveal>
              <p className="mb-0 mt-7 max-w-[760px] text-[13.5px] leading-relaxed text-[#6B7280]">
                All plans include company branding. Higher tiers add imports,
                exports, bulk reassign, white-label, priority support and
                dedicated onboarding.
              </p>
            </Reveal>
          </div>
        </section>

        <section id="security" className="vs-sec-dark px-6 py-[clamp(64px,8vw,96px)]">
          <div className="mx-auto max-w-[1200px]">
            <Reveal className="mb-11">
              <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A9BBF]">
                Security & Tenancy
              </div>
              <h2 className="mb-3.5 max-w-[620px] text-[clamp(26px,3vw,36px)] font-bold tracking-tight text-[#E8EAEF]">
                One tenant per company, one role per view.
              </h2>
              <p className="m-0 max-w-[620px] text-[15px] leading-relaxed text-[#E8EAEF]/[0.65]">
                Data separation is enforced in the product, not promised in a
                slide.
              </p>
            </Reveal>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-7">
              {(
                [
                  [Database, 'Isolated tenant', 'Each company runs in its own tenant.'],
                  [
                    KeyRound,
                    'JWT access',
                    'Short-lived tokens with httpOnly refresh cookies.',
                  ],
                  [Lock, 'Role-scoped data', 'Access is scoped by role at every query.'],
                  [
                    FileCheck,
                    'Company profile',
                    'PAN, GST and RERA on the tenant record.',
                  ],
                ] as const
              ).map(([Icon, title, body]) => (
                <Reveal key={title} className="flex flex-col gap-3">
                  <Icon className="h-5 w-5 text-[#7A9BBF]" />
                  <p className="m-0 text-sm leading-relaxed text-[#E8EAEF]/[0.72]">
                    <strong className="mb-1 block font-semibold text-[#E8EAEF]">
                      {title}
                    </strong>
                    {body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section
          id="cta"
          className="bg-[#F7F8FA] px-6 py-[clamp(72px,9vw,112px)] text-center"
        >
          <Reveal className="mx-auto max-w-[640px]">
            <h2 className="mb-7 text-[clamp(28px,3.2vw,38px)] font-bold tracking-tight text-[#1C1F26]">
              Put your sales floor in one console.
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to={signInTo} className="vs-btn vs-btn-primary px-7 py-3 text-[15px]">
                {user ? 'Open console' : 'Book a demo'}
              </Link>
              <Link to={signInTo} className="vs-btn vs-btn-outline px-7 py-3 text-[15px]">
                {signInLabel}
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="bg-[#1C1F26] px-6 pb-10 pt-[clamp(56px,7vw,80px)]">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-14 grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-10">
            <div>
              <div className="mb-4">
                <LogoMark light />
              </div>
              <p className="m-0 text-[13px] leading-relaxed text-[#E8EAEF]/[0.55]">
                Enterprise real estate lead CRM — assignment, attendance, and
                pipeline control in one workspace.
              </p>
            </div>
            <div>
              <div className="mb-3.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#7A9BBF]">
                Product
              </div>
              <div className="flex flex-col gap-2 text-[13.5px]">
                {(
                  [
                    ['#product', 'Leads & pipeline'],
                    ['#pipeline', 'Assignment'],
                    ['#hr', 'HR & Attendance'],
                    ['#pricing', 'Pricing'],
                    ['#security', 'Security'],
                  ] as const
                ).map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    className="text-[#E8EAEF]/[0.72] hover:text-[#E8EAEF]"
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
              <div className="mb-3.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#7A9BBF]">
                Company
              </div>
              <div className="flex flex-col gap-2 text-[13.5px]">
                <a href="/" className="text-[#E8EAEF]/[0.72] hover:text-[#E8EAEF]">
                  velospherecrm.com
                </a>
                <a
                  href="#cta"
                  className="text-[#E8EAEF]/[0.72] hover:text-[#E8EAEF]"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId('cta');
                  }}
                >
                  Book a demo
                </a>
                <Link to={signInTo} className="text-[#E8EAEF]/[0.72] hover:text-[#E8EAEF]">
                  {signInLabel}
                </Link>
              </div>
            </div>
            <div>
              <div className="mb-3.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#7A9BBF]">
                Legal
              </div>
              <div className="flex flex-col gap-2 text-[13.5px]">
                <span className="text-[#E8EAEF]/[0.45]">Privacy policy</span>
                <span className="text-[#E8EAEF]/[0.45]">Terms of service</span>
                <span className="text-[#E8EAEF]/[0.45]">Refund policy</span>
              </div>
            </div>
            <div>
              <div className="mb-3.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#7A9BBF]">
                Contact
              </div>
              <div className="flex flex-col gap-2 text-[13.5px] text-[#E8EAEF]/[0.72]">
                <span>Sales — book a demo</span>
                <span className="vs-mono text-[12.5px]">Asia/Kolkata (IST)</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-4 border-t border-white/[0.08] pt-6 text-[12.5px] text-[#E8EAEF]/[0.45]">
            <span>© 2026 Velosphere CRM. All rights reserved.</span>
            <span>Operating hours and timestamps in Asia/Kolkata.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
