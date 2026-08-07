import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { session, signInWithPassword, signUpWithPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

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
      const message = error instanceof Error ? error.message : t("auth.error");
      toast.error(message || t("auth.error"));
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
      const message = error instanceof Error ? error.message : t("auth.error");
      toast.error(message || t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center">
          <span className="font-display text-2xl font-semibold text-foreground">
            {t("auth.title")}
          </span>
        </Link>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("auth.subtitle")}
        </p>

        <div className="mt-8 rounded-xl border border-border/60 bg-card p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t("auth.tab.signin")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.tab.signup")}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="mt-4 space-y-4">
                <Field
                  id="email-in"
                  label={t("auth.email")}
                  type="email"
                  value={email}
                  onChange={setEmail}
                />
                <Field
                  id="pass-in"
                  label={t("auth.password")}
                  type="password"
                  value={password}
                  onChange={setPassword}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando…" : t("auth.signin")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="mt-4 space-y-4">
                <Field
                  id="name-up"
                  label={t("auth.name")}
                  type="text"
                  value={name}
                  onChange={setName}
                />
                <Field
                  id="email-up"
                  label={t("auth.email")}
                  type="email"
                  value={email}
                  onChange={setEmail}
                />
                <Field
                  id="pass-up"
                  label={t("auth.password")}
                  type="password"
                  value={password}
                  onChange={setPassword}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando conta…" : t("auth.signup")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <Link
          to="/"
          className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
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
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required
        autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "name"}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
