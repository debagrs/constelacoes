import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md">
            <div className="font-display text-lg font-semibold text-foreground">
              {t("app.name")}{" "}
              <span className="text-muted-foreground">{t("app.tagline")}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("footer.about")}
            </p>
          </div>
          <p className="text-eyebrow text-muted-foreground">
            {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
