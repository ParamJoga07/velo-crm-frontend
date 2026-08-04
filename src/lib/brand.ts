import type { LoginResponse } from '@velo/shared';

type TenantBrand = NonNullable<LoginResponse['tenant']>;

function mixHex(hex: string, withWhite: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) =>
    Math.round(c + (255 - c) * withWhite)
      .toString(16)
      .padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

function darkenHex(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const clamp = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c * (1 - amount))))
      .toString(16)
      .padStart(2, '0');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

/** Apply (or clear) tenant white-label CSS variables on :root */
export function applyTenantBrand(tenant: TenantBrand | null | undefined) {
  const root = document.documentElement;
  const product =
    tenant?.brandProductName?.trim() ||
    tenant?.name?.trim() ||
    'Velo CRM';

  document.title = product;

  const primary = tenant?.brandPrimary?.trim();
  if (primary) {
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty(
      '--color-accent',
      tenant?.brandAccent?.trim() || primary,
    );
    root.style.setProperty('--color-primary-dark', darkenHex(primary, 0.18));
    root.style.setProperty('--color-primary-muted', mixHex(primary, 0.88));
    root.style.setProperty('--color-ring', primary);
    root.style.setProperty('--login-glow', `${primary}38`);
  } else {
    root.style.removeProperty('--color-primary');
    root.style.removeProperty('--color-accent');
    root.style.removeProperty('--color-primary-dark');
    root.style.removeProperty('--color-primary-muted');
    root.style.removeProperty('--color-ring');
    root.style.removeProperty('--login-glow');
  }

  const secondary = tenant?.brandSecondary?.trim();
  if (secondary) {
    root.style.setProperty('--color-navy', secondary);
    root.style.setProperty('--rail-bg', secondary);
    root.style.setProperty('--login-bg', secondary);
  } else if (!primary) {
    root.style.removeProperty('--color-navy');
    root.style.removeProperty('--rail-bg');
    root.style.removeProperty('--login-bg');
  }

  const sidebar = tenant?.brandSidebar?.trim();
  if (sidebar) {
    root.style.setProperty('--sidebar-bg', sidebar);
  } else if (!primary) {
    root.style.removeProperty('--sidebar-bg');
  }
}

export function productNameFromTenant(
  tenant: TenantBrand | null | undefined,
): string {
  return (
    tenant?.brandProductName?.trim() ||
    tenant?.name?.trim() ||
    'Velo CRM'
  );
}
