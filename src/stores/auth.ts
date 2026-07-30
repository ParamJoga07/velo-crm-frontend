import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, LoginResponse } from '@velo/shared';
import { ApiClientError, apiFetch } from '@/lib/api';

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
  setSession: (payload: LoginResponse) => void;
  clear: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  /** After persist rehydrate: keep session if token valid, else refresh cookie, else clear. */
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
      setSession: (payload) =>
        set({
          user: payload.user,
          tenant: payload.tenant,
          accessToken: payload.tokens.accessToken,
        }),
      clear: () =>
        set({
          user: null,
          tenant: null,
          accessToken: null,
          impersonation: null,
          adminSession: null,
        }),
      login: async (email, password) => {
        const data = await apiFetch<LoginResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        set({
          user: data.user,
          tenant: data.tenant,
          accessToken: data.tokens.accessToken,
          impersonation: null,
          adminSession: null,
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
        const { accessToken, refresh, clear } = get();
        if (!accessToken) return;
        try {
          await apiFetch('/api/auth/me', { accessToken });
        } catch (err) {
          if (err instanceof ApiClientError && err.status === 401) {
            const ok = await refresh();
            if (!ok) clear();
          }
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
      onRehydrateStorage: () => () => {
        void useAuthStore.getState().bootstrap();
      },
    },
  ),
);

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

  // Safety net: never block the UI longer than a tick if persist stalls
  useEffect(() => {
    if (hydrated) return;
    const t = window.setTimeout(() => setHydrated(true), 500);
    return () => window.clearTimeout(t);
  }, [hydrated]);

  return hydrated;
}
