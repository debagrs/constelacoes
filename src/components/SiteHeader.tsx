import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function NavLinks({
  onNavigate,
  showReviewer,
}: {
  onNavigate?: () => void;
  showReviewer?: boolean;
}) {
  const { t } = useI18n();
  const links = [
    { to: "/acervo", label: t("nav.acervo") },
    { to: "/rede", label: "Rede" },
    { to: "/atlas", label: t("nav.atlas") },
    ...(showReviewer
      ? [{ to: "/curadoria/imagens", label: "Curadoria" } as const]
      : []),
  ] as const;
  return (
    <>
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          onClick={onNavigate}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground"
        >
          {l.label}
        </Link>
      ))}
    </>
  );
}


export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { session, isReviewer } = useAuth();
  const [open, setOpen] = useState(false);


  const utility = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Idioma"
        onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
      >
        <Globe className="h-4 w-4" />
        <span className="ml-1 text-xs uppercase">{locale}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Tema"
        onClick={toggleTheme}
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-baseline gap-2">
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">
            {t("app.name")}
          </span>
          <span className="hidden truncate text-eyebrow text-muted-foreground sm:inline">
            {t("app.tagline")}
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-6 md:flex">
          <NavLinks showReviewer={isReviewer} />
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {utility}
          <Button asChild size="sm" variant={session ? "outline" : "default"}>
            <Link to={session ? "/atlas" : "/auth"}>
              {session ? t("nav.painel") : t("nav.signin")}
            </Link>
          </Button>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-1 md:hidden">
          {utility}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display text-left">
                  {t("app.name")}
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-5">
                <NavLinks showReviewer={isReviewer} onNavigate={() => setOpen(false)} />
                <Button asChild className={cn("mt-2 w-full")}>
                  <Link
                    to={session ? "/atlas" : "/auth"}
                    onClick={() => setOpen(false)}
                  >
                    {session ? t("nav.painel") : t("nav.signin")}
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
