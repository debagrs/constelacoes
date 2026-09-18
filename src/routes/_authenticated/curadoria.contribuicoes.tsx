import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, ExternalLink, MessageSquareWarning, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import {
  listPendingSubmissions,
  reviewSubmission,
  updatePendingSubmission,
} from "@/lib/data/submissions.functions";
import { useAuth } from "@/lib/auth";
import { toArray, toRecord } from "@/lib/turso/rows";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submissionImageSrc } from "@/lib/image-url";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/curadoria/contribuicoes")({ component: Page });

const SUBMISSION_TYPES = ["obra","artista","projeto","movimento","conceito","objeto","arquitetura","design","performance","fotografia","filme","jogo","interface","outro"] as const;
const split = (value: string) => value.split(/[;,\n]/).map((item) => item.trim()).filter(Boolean);
const text = (value: unknown) => value == null ? "" : String(value);
const listText = (value: unknown) => toArray(value).join(", ");
const metaText = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return Array.isArray(value) ? value.map(String).join(", ") : value == null ? "" : String(value);
};
const cleanTextMetadata = (record: Record<string, unknown>) => {
  const output: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") output[key] = value;
    else if (Array.isArray(value) && value.every((item) => typeof item === "string")) output[key] = value as string[];
  }
  return output;
};

function Page() {
  const { isReviewer, loading } = useAuth();
  const fetcher = useServerFn(listPendingSubmissions);
  const review = useServerFn(reviewSubmission);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["submissions"],
    queryFn: () => fetcher() as Promise<Record<string, unknown>[]>,
    enabled: isReviewer,
  });
  const mutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: "approve" | "reject" | "needs_changes"; notes: string }) =>
      review({ data: { id, decision, notes } }),
    onSuccess: () => {
      toast.success("Decisão registrada.");
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["acervo"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = (q.data ?? []).filter((row) => {
    if (!normalizedSearch) return true;
    const sensitive = toRecord(row.sensitive_metadata);
    const haystack = [
      row.title, row.artist_name, row.subtitle, row.description, row.location, row.country, row.continent, row.culture,
      row.submitter_name, row.submitter_email, row.submitter_relation, row.image_source_url, row.source_urls,
      row.tags, row.materials, row.techniques, JSON.stringify(sensitive),
    ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
    return haystack.includes(normalizedSearch);
  });

  return (
    <Shell>
      {loading ? <Skeleton className="h-40" /> : !isReviewer ? <Restricted /> : (
        <>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-eyebrow text-muted-foreground">Curadoria participativa</p>
              <h1 className="font-display text-3xl font-semibold">Contribuições recebidas</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Nada é publicado automaticamente. Agora você pode editar todos os campos textuais antes de aprovar, pedir ajustes ou recusar.
              </p>
            </div>
            <Badge variant="secondary">{filtered.length}{normalizedSearch ? ` de ${q.data?.length ?? 0}` : ""} pendentes</Badge>
          </div>
          <div className="mb-6 max-w-2xl">
            <Label htmlFor="submission-search">Pesquisar contribuições</Label>
            <Input
              id="submission-search"
              className="mt-2"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome do aluno, instituição, obra, autoria, e-mail ou fonte…"
            />
          </div>
          {q.isLoading ? <Skeleton className="h-72" /> : filtered.length ? filtered.map((r) => (
            <Card
              key={String(r.id)}
              r={r}
              busy={mutation.isPending}
              decide={(decision, notes) => mutation.mutate({ id: String(r.id), decision, notes })}
            />
          )) : <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">{normalizedSearch ? "Nenhuma contribuição corresponde à pesquisa." : "Nenhuma contribuição aguardando análise."}</div>}
        </>
      )}
    </Shell>
  );
}

function Card({ r, busy, decide }: { r: Record<string, unknown>; busy: boolean; decide: (decision: "approve" | "reject" | "needs_changes", notes: string) => void }) {
  const sensitive = toRecord(r.sensitive_metadata);
  const poetic = toRecord(r.poetic_metadata);
  const [notes, setNotes] = useState(text(r.reviewer_notes));
  return (
    <article className="mb-6 overflow-hidden rounded-2xl border bg-card">
      <div className="grid md:grid-cols-[240px_1fr]">
        {r.image_url ? <img src={submissionImageSrc(String(r.id), String(r.image_url)) ?? undefined} alt="" className="h-full min-h-56 w-full object-cover" /> : <div className="min-h-48 bg-muted" />}
        <div className="p-6">
          <div className="flex flex-wrap gap-2"><Badge>{String(r.submission_type)}</Badge><Badge variant="outline">{String(r.status)}</Badge></div>
          <h2 className="mt-3 font-display text-2xl font-semibold">{String(r.title)}</h2>
          {r.artist_name && <p className="text-sm text-muted-foreground">{String(r.artist_name)}</p>}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{String(r.description)}</p>
          <Meta title="Contexto" values={[r.date_display, r.location, r.country, r.culture].filter(Boolean).map(String)} />
          <Meta title="Marcadores situados" values={Object.values(sensitive).flatMap((v) => Array.isArray(v) ? v.map(String) : [String(v)])} />
          <Meta title="Metadados poéticos" values={Object.values(poetic).flatMap((v) => Array.isArray(v) ? v.map(String) : [String(v)])} />
          <Meta title="Tags" values={toArray(r.tags)} />
          <div className="mt-4 text-xs text-muted-foreground">Enviado por {String(r.submitter_name)} · {String(r.submitter_email)}</div>
          {r.image_source_url && <a className="mt-3 inline-flex items-center gap-1 text-xs underline" href={String(r.image_source_url)} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" />ver fonte da imagem</a>}

          <div className="mt-5"><SubmissionEditor row={r} /></div>

          <div className="mt-5 space-y-1.5">
            <Label htmlFor={`review-notes-${String(r.id)}`}>Comentário / observação da curadoria</Label>
            <Textarea
              id={`review-notes-${String(r.id)}`}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Use este campo para registrar correções, justificativas ou o que precisa ser ajustado."
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => decide("approve", notes)}><Check className="mr-2 h-4 w-4" />Aprovar e publicar</Button>
            <Button disabled={busy} variant="outline" onClick={() => decide("needs_changes", notes)}><MessageSquareWarning className="mr-2 h-4 w-4" />Pedir ajustes</Button>
            <Button disabled={busy} variant="destructive" onClick={() => decide("reject", notes)}><X className="mr-2 h-4 w-4" />Recusar</Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SubmissionEditor({ row }: { row: Record<string, unknown> }) {
  const save = useServerFn(updatePendingSubmission);
  const queryClient = useQueryClient();
  const sensitive = toRecord(row.sensitive_metadata);
  const poetic = toRecord(row.poetic_metadata);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    submissionType: text(row.submission_type) || "obra",
    title: text(row.title),
    artistName: text(row.artist_name),
    subtitle: text(row.subtitle),
    description: text(row.description),
    dateDisplay: text(row.date_display),
    location: text(row.location),
    country: text(row.country),
    continent: text(row.continent),
    culture: text(row.culture),
    imageUrl: text(row.image_url),
    imageSourceUrl: text(row.image_source_url),
    imageLicense: text(row.image_license),
    sourceUrls: listText(row.source_urls),
    tags: listText(row.tags),
    materials: listText(row.materials),
    techniques: listText(row.techniques),
    marcadoresSociais: metaText(sensitive, "marcadores_sociais_autodeclarados"),
    maternidades: metaText(sensitive, "maternidades_cuidados"),
    povosComunidades: metaText(sensitive, "povos_comunidades"),
    animalidades: metaText(sensitive, "animalidades_percepcao_animal"),
    bioetica: metaText(sensitive, "bioetica"),
    alemAntropoceno: metaText(sensitive, "alem_do_antropoceno"),
    sourceInstitution: metaText(sensitive, "instituicao_origem"),
    sensorialidades: metaText(poetic, "sensorialidades"),
    afetos: metaText(poetic, "afetos"),
    temporalidades: metaText(poetic, "temporalidades"),
    submitterName: text(row.submitter_name),
    submitterEmail: text(row.submitter_email),
    submitterRelation: text(row.submitter_relation),
  }));
  const inlineImage = form.imageUrl.startsWith("data:image/");
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await save({ data: {
        id: String(row.id),
        submissionType: form.submissionType as (typeof SUBMISSION_TYPES)[number],
        title: form.title,
        artistName: form.artistName,
        subtitle: form.subtitle,
        description: form.description,
        dateDisplay: form.dateDisplay,
        location: form.location,
        country: form.country,
        continent: form.continent,
        culture: form.culture,
        imageUrl: form.imageUrl,
        imageSourceUrl: form.imageSourceUrl,
        imageLicense: form.imageLicense,
        sourceUrls: split(form.sourceUrls),
        tags: split(form.tags),
        materials: split(form.materials),
        techniques: split(form.techniques),
        sensitiveMetadata: {
          ...cleanTextMetadata(sensitive),
          marcadores_sociais_autodeclarados: split(form.marcadoresSociais),
          maternidades_cuidados: split(form.maternidades),
          povos_comunidades: split(form.povosComunidades),
          animalidades_percepcao_animal: split(form.animalidades),
          bioetica: split(form.bioetica),
          alem_do_antropoceno: split(form.alemAntropoceno),
          instituicao_origem: form.sourceInstitution.trim(),
        },
        poeticMetadata: {
          ...cleanTextMetadata(poetic),
          sensorialidades: split(form.sensorialidades),
          afetos: split(form.afetos),
          temporalidades: split(form.temporalidades),
        },
        submitterName: form.submitterName,
        submitterEmail: form.submitterEmail,
        submitterRelation: form.submitterRelation,
      } });
      toast.success("Contribuição atualizada pela curadoria.");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["submissions"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button" size="sm" variant="outline"><Pencil className="mr-2 h-4 w-4" />Editar todos os campos</Button></DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar contribuição</DialogTitle>
          <DialogDescription>As alterações são salvas na fila. Ao aprovar, a versão corrigida é a que será publicada.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <EditSelect label="Tipo" value={form.submissionType} onChange={(v) => set("submissionType", v)} />
            <EditField label="Título" value={form.title} onChange={(v) => set("title", v)} required />
            <EditField label="Artista, autoria ou comunidade" value={form.artistName} onChange={(v) => set("artistName", v)} />
            <EditField label="Subtítulo" value={form.subtitle} onChange={(v) => set("subtitle", v)} />
          </div>
          <EditArea label="Descrição curatorial" value={form.description} onChange={(v) => set("description", v)} rows={7} required />
          <div className="grid gap-4 md:grid-cols-3">
            <EditField label="Data / período" value={form.dateDisplay} onChange={(v) => set("dateDisplay", v)} />
            <EditField label="Local" value={form.location} onChange={(v) => set("location", v)} />
            <EditField label="País / território" value={form.country} onChange={(v) => set("country", v)} />
            <EditField label="Continente / região" value={form.continent} onChange={(v) => set("continent", v)} />
            <EditField label="Cultura / contexto" value={form.culture} onChange={(v) => set("culture", v)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {inlineImage ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">Esta contribuição contém uma foto enviada pelo dispositivo. Ela será preservada. Para removê-la, use o botão abaixo.<div className="mt-3"><Button type="button" size="sm" variant="outline" onClick={() => set("imageUrl", "")}>Remover foto</Button></div></div>
            ) : <EditField label="URL direta da imagem" value={form.imageUrl} onChange={(v) => set("imageUrl", v)} type="url" />}
            <EditField label="Página de origem da imagem" value={form.imageSourceUrl} onChange={(v) => set("imageSourceUrl", v)} type="url" />
            <EditField label="Licença da imagem" value={form.imageLicense} onChange={(v) => set("imageLicense", v)} />
            <EditField label="Instituição / acervo de origem" value={form.sourceInstitution} onChange={(v) => set("sourceInstitution", v)} />
            <EditArea label="Outras fontes" hint="uma por linha, vírgula ou ponto e vírgula" value={form.sourceUrls} onChange={(v) => set("sourceUrls", v)} rows={3} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <EditArea label="Tags" value={form.tags} onChange={(v) => set("tags", v)} rows={3} />
            <EditArea label="Materiais" value={form.materials} onChange={(v) => set("materials", v)} rows={3} />
            <EditArea label="Técnicas" value={form.techniques} onChange={(v) => set("techniques", v)} rows={3} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <EditArea label="Marcadores sociais autodeclarados" value={form.marcadoresSociais} onChange={(v) => set("marcadoresSociais", v)} rows={3} />
            <EditArea label="Maternidades e práticas de cuidado" value={form.maternidades} onChange={(v) => set("maternidades", v)} rows={3} />
            <EditArea label="Povos, comunidades e pertencimentos" value={form.povosComunidades} onChange={(v) => set("povosComunidades", v)} rows={3} />
            <EditArea label="Animalidades e percepção animal" value={form.animalidades} onChange={(v) => set("animalidades", v)} rows={3} />
            <EditArea label="Bioética" value={form.bioetica} onChange={(v) => set("bioetica", v)} rows={3} />
            <EditArea label="Além do Antropoceno" value={form.alemAntropoceno} onChange={(v) => set("alemAntropoceno", v)} rows={3} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <EditArea label="Sensorialidades" value={form.sensorialidades} onChange={(v) => set("sensorialidades", v)} rows={3} />
            <EditArea label="Afetos e intensidades" value={form.afetos} onChange={(v) => set("afetos", v)} rows={3} />
            <EditArea label="Temporalidades" value={form.temporalidades} onChange={(v) => set("temporalidades", v)} rows={3} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <EditField label="Nome de quem enviou" value={form.submitterName} onChange={(v) => set("submitterName", v)} required />
            <EditField label="E-mail de quem enviou" value={form.submitterEmail} onChange={(v) => set("submitterEmail", v)} type="email" required />
          </div>
          <EditArea label="Relação com a obra, artista ou comunidade" value={form.submitterRelation} onChange={(v) => set("submitterRelation", v)} rows={4} />
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditField({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  const id = `submission-${label.replace(/\W/g, "-")}`;
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}{required ? " *" : ""}</Label><Input id={id} type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></div>;
}

function EditArea({ label, value, onChange, rows = 4, hint, required = false }: { label: string; value: string; onChange: (value: string) => void; rows?: number; hint?: string; required?: boolean }) {
  const id = `submission-${label.replace(/\W/g, "-")}`;
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}{required ? " *" : ""}</Label>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}<Textarea id={id} rows={rows} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></div>;
}

function EditSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-1.5"><Label>{label}</Label><select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{SUBMISSION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>;
}

function Meta({ title, values }: { title: string; values: string[] }) {
  if (!values.length) return null;
  return <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p><div className="mt-2 flex flex-wrap gap-2">{values.filter(Boolean).map((v, i) => <Badge key={`${v}-${i}`} variant="secondary">{v}</Badge>)}</div></div>;
}

function Restricted() {
  return <div className="rounded-xl border bg-card p-10 text-center"><h1 className="font-display text-2xl font-semibold">Acesso restrito</h1><p className="mt-2 text-muted-foreground">Somente administradores e curadores podem revisar contribuições.</p><Button asChild className="mt-5"><Link to="/">Voltar</Link></Button></div>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main><SiteFooter /></div>;
}
