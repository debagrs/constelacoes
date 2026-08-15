import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, LogOut } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  createAtlas as createAtlasFn,
  listMyAtlases,
} from "@/lib/data/atlas.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABEL_KEY, type ContentStatus } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/atlas/")({
  component: AtlasList,
});

interface AtlasRow {
  id: string;
  title: string;
  description: string | null;
  status: ContentStatus;
  updated_at: string;
}

function AtlasList() {
  const { t } = useI18n();
  const { user, displayName, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchAtlases = useServerFn(listMyAtlases);
  const createAtlasOnServer = useServerFn(createAtlasFn);

  const { data = [], isLoading, error } = useQuery<AtlasRow[]>({
    queryKey: ["my-atlases", user?.id],
    queryFn: async () => {
      const rows = await fetchAtlases();
      return rows.map((atlas) => ({
        id: atlas.id,
        title: atlas.title,
        description: atlas.description,
        status: atlas.status as ContentStatus,
        updated_at: atlas.updated_at,
      }));
    },
    enabled: Boolean(user),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      createAtlasOnServer({
        data: {
          title: "Novo Atlas",
          description: "",
        },
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["my-atlases"] });
      navigate({
        to: "/atlas/$atlasId",
        params: { atlasId: created.id },
      });
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível criar o Atlas.";
      toast.error(message);
    },
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const createAtlas = () => {
    if (!user || createMutation.isPending) return;
    createMutation.mutate();
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
              {displayName
                ? `${t("common.by")} ${displayName}`
                : t("atlas.list.subtitle")}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              aria-label={t("nav.signout")}
            >
              <LogOut className="h-4 w-4" />
            </Button>

            <Button onClick={createAtlas} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4" />
              {t("atlas.list.new")}
            </Button>
          </div>
        </div>

        <div className="mt-10">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-8">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Não foi possível carregar seus Atlas
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Confira a conexão com o banco Turso e tente novamente."}
              </p>
            </div>
          ) : data.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-20 text-center">
              <p className="text-muted-foreground">{t("atlas.list.empty")}</p>
              <Button
                className="mt-6"
                onClick={createAtlas}
                disabled={createMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                {t("atlas.list.new")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((atlas) => (
                <div
                  key={atlas.id}
                  className="flex flex-col justify-between rounded-lg border border-border/60 bg-card p-5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-xl font-medium text-foreground">
                        {atlas.title}
                      </h2>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[0.65rem] uppercase"
                      >
                        {t(STATUS_LABEL_KEY[atlas.status] as never)}
                      </Badge>
                    </div>

                    {atlas.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {atlas.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to="/atlas/$atlasId"
                        params={{ atlasId: atlas.id }}
                      >
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
