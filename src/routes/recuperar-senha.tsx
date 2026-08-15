import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { resetPasswordWithToken } from "@/lib/auth/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/recuperar-senha")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const resetPassword = useServerFn(resetPasswordWithToken);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const raw = window.location.hash.startsWith("#token=")
      ? window.location.hash.slice("#token=".length)
      : "";
    if (raw) {
      setToken(decodeURIComponent(raw));
      // O fragmento nunca é enviado ao servidor; removê-lo também evita que
      // permaneça no histórico ou seja copiado acidentalmente.
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("O link de recuperação é inválido ou já não contém um token.");
      return;
    }
    if (password !== confirm) {
      toast.error("As duas senhas precisam ser iguais.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ data: { token, newPassword: password } });
      setDone(true);
      setToken("");
      toast.success("Senha alterada com segurança. Todas as sessões anteriores foram encerradas.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-6">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-semibold">Criar nova senha</h1>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              O link é de uso único. Ao concluir, todas as sessões anteriores da conta serão encerradas.
            </p>
          </div>
        </div>

        {done ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-6">Sua senha foi alterada. Entre novamente com a nova senha.</p>
            <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>Ir para o login</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {!token && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                Este link não contém um token válido. Solicite uma nova recuperação na tela de login.
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Repita a nova senha</Label>
              <Input id="confirm-password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Mínimo de 12 caracteres. Uma frase-senha longa ou um gerenciador de senhas é preferível.</p>
            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? "Alterando…" : "Alterar senha"}
            </Button>
            <Link to="/auth" className="block text-center text-sm text-muted-foreground hover:text-foreground">Solicitar outro link</Link>
          </form>
        )}
      </div>
    </div>
  );
}
