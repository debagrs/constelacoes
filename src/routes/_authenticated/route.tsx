import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/auth.functions";
import { currentUserQueryKey } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    // Reutiliza a mesma entrada do React Query usada pelo AuthProvider.
    // Assim, entrar em /atlas ou /curadoria não dispara duas chamadas iguais
    // para a sessão no mesmo instante.
    const user = await context.queryClient.ensureQueryData({
      queryKey: currentUserQueryKey,
      queryFn: () => getCurrentUser(),
      staleTime: 2 * 60_000,
    });
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
