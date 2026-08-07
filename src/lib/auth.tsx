import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCurrentUser,
  signIn as signInFn,
  signOut as signOutFn,
  signUp as signUpFn,
} from "@/lib/auth/auth.functions";

export type AppRole = "admin" | "curador" | "professor" | "estudante";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
}

interface AuthContextValue {
  user: SessionUser | null;
  session: SessionUser | null;
  roles: string[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  isReviewer: boolean;
  isProfessor: boolean;
  displayName: string | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const currentUserQueryKey = ["current-user"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getCurrentUser);
  const doSignIn = useServerFn(signInFn);
  const doSignUp = useServerFn(signUpFn);
  const doSignOut = useServerFn(signOutFn);

  const { data, isLoading } = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: () => fetchMe(),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const user = (data as SessionUser | null) ?? null;

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      await doSignIn({ data: { email, password } });
      // Não invalida o Atlas inteiro: só a sessão mudou.
      await queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    },
    [doSignIn, queryClient],
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string, displayName: string) => {
      await doSignUp({ data: { email, password, displayName } });
      await queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    },
    [doSignUp, queryClient],
  );

  const signOut = useCallback(async () => {
    await doSignOut({});
    queryClient.setQueryData(currentUserQueryKey, null);
    // Remove somente dados privados da sessão anterior. O acervo público permanece em cache.
    queryClient.removeQueries({ queryKey: ["my-atlases"] });
    queryClient.removeQueries({ queryKey: ["atlas"] });
  }, [doSignOut, queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const roles = user?.roles ?? [];
    const hasRole = (role: AppRole) => roles.includes(role);
    return {
      user,
      session: user,
      roles,
      loading: isLoading,
      hasRole,
      isReviewer: hasRole("admin") || hasRole("curador"),
      isProfessor: hasRole("admin") || hasRole("professor"),
      displayName: user?.displayName ?? null,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    };
  }, [user, isLoading, signInWithPassword, signUpWithPassword, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
