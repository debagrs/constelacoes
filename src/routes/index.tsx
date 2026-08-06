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

async function fetchFeatured(): Promise<AcervoEntity[]> {
  return (await listFeatured()) as AcervoEntity[];
}

function Index() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["featured-entities"],
    queryFn: fetchFeatured,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
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

        {/* Featured */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                {t("home.featured")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("home.featured.sub")}
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

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/5] w-full rounded-lg" />
                ))
              : data?.map((e) => <EntityCard key={e.id} entity={e} />)}
          </div>
        </section>

        {/* Method / pillars */}
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
