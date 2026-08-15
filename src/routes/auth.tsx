import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { requestPasswordReset } from "@/lib/auth/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { session, signInWithPassword, signUpWithPassword } = useAuth();
  const requestReset = useServerFn(requestPasswordReset);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [forgot, setForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/atlas", replace: true });
  }, [session, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      toast.success(t("auth.signin_success"));
      navigate({ to: "/atlas", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUpWithPassword(email, password, name);
      toast.success(t("auth.signup_success"));
      navigate({ to: "/atlas", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await requestReset({ data: { email: resetEmail } });
      setRequestSent(true);
      toast.success(result.message);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "A recuperação por e-mail está temporariamente indisponível.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center">
          <span className="font-display text-2xl font-semibold text-foreground">
            {t("auth.title")}
          </span>
        </Link>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t("auth.subtitle")}</p>

        {!forgot ? (
          <div className="mt-8 rounded-xl border border-border/60 bg-card p-6">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t("auth.tab.signin")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.tab.signup")}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="mt-4 space-y-4">
                  <Field id="email-in" label={t("auth.email")} type="email" value={email} onChange={setEmail} autoComplete="email" />
                  <Field id="pass-in" label={t("auth.password")} type="password" value={password} onChange={setPassword} autoComplete="current-password" />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Entrando…" : t("auth.signin")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setRequestSent(false);
                      setForgot(true);
                    }}
                    className="mx-auto block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="mt-4 space-y-4">
                  <Field id="name-up" label={t("auth.name")} type="text" value={name} onChange={setName} autoComplete="name" />
                  <Field id="email-up" label={t("auth.email")} type="email" value={email} onChange={setEmail} autoComplete="email" />
                  <Field id="pass-up" label={t("auth.password")} type="password" value={password} onChange={setPassword} autoComplete="new-password" />
                  <p className="text-xs text-muted-foreground">Use pelo menos 12 caracteres e, de preferência, um gerenciador de senhas.</p>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Criando conta…" : t("auth.signup")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-border/60 bg-card p-6">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-xl font-semibold">Recuperar senha</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Informe o e-mail da conta. Se ele estiver cadastrado, você receberá um link único, válido por 15 minutos.
                </p>
              </div>
            </div>

            {!requestSent ? (
              <form onSubmit={handleForgot} className="mt-5 space-y-4">
                <Field id="reset-email" label="E-mail" type="email" value={resetEmail} onChange={setResetEmail} autoComplete="email" />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando…" : "Enviar link seguro"}
                </Button>
              </form>
            ) : (
              <div className="mt-5 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm leading-6">
                Se existir uma conta para este e-mail, o link foi enviado. Verifique também spam e lixo eletrônico.
              </div>
            )}

            <Button type="button" variant="ghost" className="mt-3 w-full" onClick={() => setForgot(false)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao login
            </Button>
          </div>
        )}

        <Link to="/" className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">
          {t("common.back")}
        </Link>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
