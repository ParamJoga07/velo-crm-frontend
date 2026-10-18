import { Flame, Snowflake, Sun } from 'lucide-react';
import type { LeadPriority, LeadStage } from '@velo/shared';

export type StagePaint = {
  /** Solid rail above the label for the current stage. */
  rail: string;
  /** Softer rail for stages the lead has already walked past. */
  railDone: string;
  /** Chip styling for the current stage. */
  chip: string;
  /** Halo behind the current chip so the eye lands on it immediately. */
  glow: string;
  /** Muted text for a passed stage. */
  doneText: string;
};

// Tailwind only keeps classes it can see as literals, so every variant is
// written out in full rather than assembled from the stage key.
export const STAGE_PAINT: Record<LeadStage, StagePaint> = {
  INCOMING: {
    rail: 'bg-sky-500',
    railDone: 'bg-sky-500/40',
    chip: 'border-sky-500/70 bg-sky-500/20 text-sky-800 dark:text-sky-100',
    glow: 'shadow-[0_0_20px_-4px_rgba(14,165,233,0.75)]',
    doneText: 'text-sky-700/80 dark:text-sky-300/80',
  },
  CONTACTED: {
    rail: 'bg-indigo-500',
    railDone: 'bg-indigo-500/40',
    chip: 'border-indigo-500/70 bg-indigo-500/20 text-indigo-800 dark:text-indigo-100',
    glow: 'shadow-[0_0_20px_-4px_rgba(99,102,241,0.75)]',
    doneText: 'text-indigo-700/80 dark:text-indigo-300/80',
  },
  PROSPECT: {
    rail: 'bg-emerald-500',
    railDone: 'bg-emerald-500/40',
    chip: 'border-emerald-500/70 bg-emerald-500/20 text-emerald-800 dark:text-emerald-100',
    glow: 'shadow-[0_0_20px_-4px_rgba(16,185,129,0.75)]',
    doneText: 'text-emerald-700/80 dark:text-emerald-300/80',
  },
  DNP1: {
    rail: 'bg-amber-500',
    railDone: 'bg-amber-500/40',
    chip: 'border-amber-500/70 bg-amber-500/20 text-amber-900 dark:text-amber-100',
    glow: 'shadow-[0_0_20px_-4px_rgba(245,158,11,0.75)]',
    doneText: 'text-amber-700/80 dark:text-amber-300/80',
  },
  DNP2: {
    rail: 'bg-orange-500',
    railDone: 'bg-orange-500/40',
    chip: 'border-orange-500/70 bg-orange-500/20 text-orange-900 dark:text-orange-100',
    glow: 'shadow-[0_0_20px_-4px_rgba(249,115,22,0.75)]',
    doneText: 'text-orange-700/80 dark:text-orange-300/80',
  },
  DNP3: {
    rail: 'bg-rose-500',
    railDone: 'bg-rose-500/40',
    chip: 'border-rose-500/70 bg-rose-500/20 text-rose-800 dark:text-rose-100',
    glow: 'shadow-[0_0_20px_-4px_rgba(244,63,94,0.75)]',
    doneText: 'text-rose-700/80 dark:text-rose-300/80',
  },
  WON: {
    rail: 'bg-teal-500',
    railDone: 'bg-teal-500/40',
    chip: 'border-teal-500/70 bg-teal-500/20 text-teal-800 dark:text-teal-100',
    glow: 'shadow-[0_0_20px_-4px_rgba(20,184,166,0.75)]',
    doneText: 'text-teal-700/80 dark:text-teal-300/80',
  },
  LOST: {
    rail: 'bg-slate-500',
    railDone: 'bg-slate-500/40',
    chip: 'border-slate-500/70 bg-slate-500/20 text-slate-700 dark:text-slate-100',
    glow: 'shadow-[0_0_20px_-4px_rgba(100,116,139,0.7)]',
    doneText: 'text-slate-600/80 dark:text-slate-300/80',
  },
};

export const PRIORITY_PAINT: Record<
  LeadPriority,
  { icon: typeof Flame; selected: string; idle: string }
> = {
  HOT: {
    icon: Flame,
    selected:
      'border-rose-400 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_0_24px_-4px_rgba(244,63,94,0.85)]',
    idle: 'border-rose-500/30 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300',
  },
  WARM: {
    icon: Sun,
    selected:
      'border-amber-400 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_24px_-4px_rgba(249,115,22,0.85)]',
    idle: 'border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300',
  },
  COLD: {
    icon: Snowflake,
    selected:
      'border-cyan-400 bg-gradient-to-br from-cyan-400 to-sky-600 text-white shadow-[0_0_24px_-4px_rgba(6,182,212,0.85)]',
    idle: 'border-cyan-500/30 text-cyan-700 hover:bg-cyan-500/10 dark:text-cyan-300',
  },
};
