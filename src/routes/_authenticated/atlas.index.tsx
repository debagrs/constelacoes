import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABEL_KEY, type ContentStatus } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/atlas")({
  component: AtlasList,
});

interface AtlasRow {
  id: string;
  title: string;
  description: string | null;
  status: ContentStatus;
  updated_at: string;
}

async function fetchMyAtlases(userId: string): Promise<AtlasRow[]> {
  const { data, error } = await supabase
    .from("atlases")
    .select("id, title, description, status, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function AtlasList() {
  const { t } = useI18n();
  const { user, displayName, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-atlases", user?.id],
    queryFn: () => fetchMyAtlases(user!.id),
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const createAtlas = async () => {
    if (!user) return;
    const { data: created, error } = await supabase
      .from("atlases")
      .insert({ owner_id: user.id, title: "Novo Atlas" })
      .select("id")
      .single();
    if (!error && created) {
      queryClient.invalidateQueries({ queryKey: ["my-atlases"] });
      navigate({ to: "/atlas/$atlasId", params: { atlasId: created.id } });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-semibold text-foreground sm:text-4xl">
              {t("atlas.list.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {displayName ? `${t("common.by")} ${displayName}` : t("atlas.list.subtitle")}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label={t("nav.signout")}>
              <LogOut className="h-4 w-4" />
            </Button>
            <Button onClick={createAtlas}>
              <Plus className="h-4 w-4" />
              {t("atlas.list.new")}
            </Button>
          </div>
        </div>

        <div className="mt-10">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-20 text-center">
              <p className="text-muted-foreground">{t("atlas.list.empty")}</p>
              <Button className="mt-6" onClick={createAtlas}>
                <Plus className="h-4 w-4" />
                {t("atlas.list.new")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data!.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col justify-between rounded-lg border border-border/60 bg-card p-5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-xl font-medium text-foreground">
                        {a.title}
                      </h2>
                      <Badge variant="secondary" className="shrink-0 text-[0.65rem] uppercase">
                        {t(STATUS_LABEL_KEY[a.status] as never)}
                      </Badge>
                    </div>
                    {a.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {a.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/atlas/$atlasId" params={{ atlasId: a.id }}>
                        {t("atlas.list.open")}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
