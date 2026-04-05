import { useForjaSession } from "@forja/ForjaSessionContext";
import { useCallback, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/** Auth state for Forja embedded in SanFran — backed by Supabase session passed via ForjaSessionProvider. */
export function useAuth(_options?: UseAuthOptions) {
  const session = useForjaSession();

  const user = useMemo(
    () => ({
      id: 0,
      name: session.displayName || session.email?.split("@")[0] || "Usuário",
      email: session.email ?? "",
    }),
    [session.displayName, session.email]
  );

  const logout = useCallback(() => {
    session.onLeaveForja();
  }, [session]);

  return {
    user,
    loading: false,
    error: null,
    isAuthenticated: true,
    refresh: async () => {},
    logout,
  };
}
