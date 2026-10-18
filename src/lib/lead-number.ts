/** Display form for Lead.leadNo, e.g. 42 -> "L-000042". Mirrors the backend. */
export function formatLeadNo(leadNo: number | null | undefined): string {
  if (leadNo == null) return '—';
  return `L-${String(leadNo).padStart(6, '0')}`;
}
