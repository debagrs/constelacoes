import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCheck2, Images, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/curadoria/")({
  component: CuradoriaHome,
});

function CuradoriaHome() {
  const { isReviewer, user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
        {!isReviewer ? (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl font-semibold">Acesso restrito</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta área só é liberada pelo servidor para e-mails autorizados de curadoria.
            </p>
            <Button asChild className="mt-6"><Link to="/">Voltar</Link></Button>
          </div>
        ) : (
          <>
            <p className="text-eyebrow text-primary">Área protegida</p>
            <h1 className="mt-2 font-display text-4xl font-semibold">Curadoria</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Sessão autorizada para {user?.email}. Revise contribuições antes da publicação e acompanhe sugestões de imagens do acervo.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <Link
                to="/curadoria/contribuicoes"
                className="rounded-2xl border bg-card p-6 transition hover:border-primary/50 hover:shadow-md"
              >
                <FileCheck2 className="h-7 w-7 text-primary" />
                <h2 className="mt-5 font-display text-2xl font-semibold">Contribuições</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Aprovar, pedir ajustes ou recusar obras, artistas e demais registros enviados pela comunidade.
                </p>
              </Link>

              <Link
                to="/curadoria/imagens"
                className="rounded-2xl border bg-card p-6 transition hover:border-primary/50 hover:shadow-md"
              >
                <Images className="h-7 w-7 text-primary" />
                <h2 className="mt-5 font-display text-2xl font-semibold">Imagens</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Revisar sugestões de imagem, fonte e adequação de licença antes de associá-las ao acervo.
                </p>
              </Link>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

