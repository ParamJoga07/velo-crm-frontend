import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, LoginResponse } from '@velo/shared';
import { ApiClientError, apiFetch, registerAuthRefresh } from '@/lib/api';
import { applyTenantBrand } from '@/lib/brand';

type TenantInfo = LoginResponse['tenant'];

type ImpersonationMeta = {
  adminId: string;
  adminName: string;
  adminEmail: string;
  targetUserId: string;
  targetName: string;
};

type SavedAdminSession = {
  user: AuthUser;
  tenant: TenantInfo;
  accessToken: string;
};

type AuthState = {
  user: AuthUser | null;
  tenant: TenantInfo | null;
  accessToken: string | null;
  impersonation: ImpersonationMeta | null;
  adminSession: SavedAdminSession | null;
  /** False until post-reload bootstrap finishes (avoids 401 race). */
  sessionReady: boolean;
  setSession: (payload: LoginResponse) => void;
  clear: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  bootstrap: () => Promise<void>;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      accessToken: null,
      impersonation: null,
      adminSession: null,
      sessionReady: false,
      setSession: (payload) => {
        applyTenantBrand(payload.tenant);
        set({
          user: payload.user,
          tenant: payload.tenant,
          accessToken: payload.tokens.accessToken,
          sessionReady: true,
        });
      },
      clear: () => {
        applyTenantBrand(null);
        set({
          user: null,
          tenant: null,
          accessToken: null,
          impersonation: null,
          adminSession: null,
          sessionReady: true,
        });
      },
      login: async (email, password) => {
        const data = await apiFetch<LoginResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        applyTenantBrand(data.tenant);
        set({
          user: data.user,
          tenant: data.tenant,
          accessToken: data.tokens.accessToken,
          impersonation: null,
          adminSession: null,
          sessionReady: true,
        });
      },
      logout: async () => {
        try {
          await apiFetch('/api/auth/logout', {
            method: 'POST',
            accessToken: get().accessToken,
          });
        } finally {
          get().clear();
        }
      },
      refresh: async () => {
        try {
          const data = await apiFetch<LoginResponse>('/api/auth/refresh', {
            method: 'POST',
          });
          get().setSession(data);
          return true;
        } catch {
          get().clear();
          return false;
        }
      },
      bootstrap: async () => {
        const { accessToken, user, refresh, clear } = get();
        try {
          if (!accessToken && !user) {
            return;
          }
          if (!accessToken && user) {
            const ok = await refresh();
            if (!ok) clear();
            return;
          }
          try {
            await apiFetch('/api/auth/me', { accessToken });
          } catch (err) {
            if (err instanceof ApiClientError && err.status === 401) {
              const ok = await refresh();
              if (!ok) clear();
            }
          }
        } finally {
          set({ sessionReady: true });
        }
      },
      startImpersonation: async (userId: string) => {
        const { user, tenant, accessToken } = get();
        if (!user || !tenant || !accessToken) {
          throw new Error('Not signed in');
        }
        const data = await apiFetch<
          LoginResponse & { impersonation: ImpersonationMeta }
        >(`/api/users/${userId}/impersonate`, {
          method: 'POST',
          accessToken,
        });
        set({
          adminSession: get().adminSession ?? {
            user,
            tenant,
            accessToken,
          },
          user: data.user,
          tenant: data.tenant,
          accessToken: data.tokens.accessToken,
          impersonation: data.impersonation,
          sessionReady: true,
        });
      },
      stopImpersonation: () => {
        const admin = get().adminSession;
        if (!admin) {
          set({ impersonation: null });
          return;
        }
        set({
          user: admin.user,
          tenant: admin.tenant,
          accessToken: admin.accessToken,
          impersonation: null,
          adminSession: null,
          sessionReady: true,
        });
      },
    }),
    {
      name: 'velo-auth',
      partialize: (s) => ({
        user: s.user,
        tenant: s.tenant,
        accessToken: s.accessToken,
        impersonation: s.impersonation,
        adminSession: s.adminSession,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.tenant) applyTenantBrand(state.tenant);
        void useAuthStore.getState().bootstrap();
      },
    },
  ),
);

registerAuthRefresh(async () => {
  const ok = await useAuthStore.getState().refresh();
  return ok ? useAuthStore.getState().accessToken : null;
});

/** True once localStorage session has been read into the store. */
export function useAuthHasHydrated() {
  const [hydrated, setHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated(),
  );

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) return;
    const t = window.setTimeout(() => {
      setHydrated(true);
      void useAuthStore.getState().bootstrap();
    }, 800);
    return () => window.clearTimeout(t);
  }, [hydrated]);

  return hydrated;
}
