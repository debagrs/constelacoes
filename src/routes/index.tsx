import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Network, LayoutGrid, GitBranch, ArrowRight } from "lucide-react";
import { listFeatured } from "@/lib/data/acervo.functions";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EntityCard, type AcervoEntity } from "@/components/EntityCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: Index,
});

type FeaturedEntity = AcervoEntity & {
  featured_category?: string;
  featured_category_id?: string;
};

async function fetchFeatured(): Promise<FeaturedEntity[]> {
  return (await listFeatured()) as FeaturedEntity[];
}

function Index() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["featured-entities", "random-home"],
    queryFn: fetchFeatured,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <p className="text-eyebrow text-primary">{t("home.method.eyebrow")}</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              {t("home.hero.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t("home.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/acervo">
                  {t("home.hero.cta_explore")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">{t("home.hero.cta_atlas")}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                {t("home.featured")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A cada entrada, uma nova constelação: um representante aleatório de cada perspectiva curatorial.
              </p>
            </div>
            <Link
              to="/acervo"
              className="hidden shrink-0 items-center gap-1 text-sm text-primary hover:underline sm:flex"
            >
              {t("common.explore")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="mb-2 h-4 w-28" />
                    <Skeleton className="aspect-[4/5] w-full rounded-lg" />
                  </div>
                ))
              : data?.map((e) => (
                  <div key={`${e.featured_category_id ?? "acervo"}-${e.id}`}>
                    <p className="mb-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-primary">
                      {e.featured_category ?? "Acervo aberto"}
                    </p>
                    <EntityCard entity={e} />
                  </div>
                ))}
          </div>
        </section>

        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="max-w-2xl font-display text-2xl font-semibold text-foreground sm:text-3xl">
              {t("home.method.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              {t("home.method.body")}
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: Network,
                  title: t("home.pillars.relations"),
                  body: t("home.pillars.relations.body"),
                },
                {
                  icon: LayoutGrid,
                  title: t("home.pillars.atlas"),
                  body: t("home.pillars.atlas.body"),
                },
                {
                  icon: GitBranch,
                  title: t("home.pillars.curation"),
                  body: t("home.pillars.curation.body"),
                },
              ].map((p) => (
                <div
                  key={p.title}
                  className="rounded-lg border border-border/60 bg-background p-6"
                >
                  <p.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 font-display text-xl font-medium text-foreground">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
