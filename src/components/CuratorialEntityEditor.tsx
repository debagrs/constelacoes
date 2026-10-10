import { useEffect, useState, type FormEvent, type HTMLAttributes } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCuratorialEntity,
  getCuratorialEntity,
  updateCuratorialEntity,
} from "@/lib/data/curadoria.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const split = (value: string) => value.split(/[;,\n]/).map((item) => item.trim()).filter(Boolean);
const asText = (value: unknown) => typeof value === "string" ? value : value == null ? "" : String(value);
const asBoolean = (value: unknown) => value === true || value === 1 || value === "1";
const arrayText = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).join(", ") : value;
  } catch {
    return value;
  }
};
const jsonText = (value: unknown) => {
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value || "{}"; }
  }
  return JSON.stringify(value ?? {}, null, 2);
};
const nullableNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const ENTITY_TYPES = [
  "obra", "artista", "projeto", "movimento", "conceito", "objeto", "arquitetura", "design",
  "performance", "instalacao", "fotografia", "filme", "jogo", "interface", "patrimonio", "outro",
];

const CURATORIAL_FACETS = [
  { id: "curadoria:mulheres-e-maes", label: "Mulheres e mães" },
  { id: "curadoria:indigenas", label: "Indígenas" },
  { id: "curadoria:negros-e-diasporas", label: "Negros e diásporas" },
  { id: "curadoria:lgbtqia", label: "LGBTQIA+" },
  { id: "curadoria:bioetica-e-animalidades", label: "Bioética e animalidades" },
  { id: "curadoria:alem-do-antropoceno", label: "Além do Antropoceno" },
] as const;

type FormState = {
  entityType: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  dateDisplay: string;
  location: string;
  country: string;
  continent: string;
  culture: string;
  regionId: string;
  people: string;
  cosmology: string;
  latitude: string;
  longitude: string;
  imageUrl: string;
  imageLicense: string;
  openImage: boolean;
  sourceUrl: string;
  tags: string;
  themes: string;
  colors: string;
  materials: string;
  techniques: string;
  metadataJson: string;
  curatorialFacets: Array<(typeof CURATORIAL_FACETS)[number]["id"]>;
  status: "draft" | "review" | "published" | "archived";
};

const emptyForm: FormState = {
  entityType: "obra",
  title: "",
  slug: "",
  subtitle: "",
  description: "",
  dateStart: "",
  dateEnd: "",
  dateDisplay: "",
  location: "",
  country: "",
  continent: "",
  culture: "",
  regionId: "",
  people: "",
  cosmology: "",
  latitude: "",
  longitude: "",
  imageUrl: "",
  imageLicense: "",
  openImage: false,
  sourceUrl: "",
  tags: "",
  themes: "",
  colors: "",
  materials: "",
  techniques: "",
  metadataJson: "{}",
  curatorialFacets: [],
  status: "review",
};

export function CuratorialEntityEditor({ entityId, onSaved }: { entityId: string; onSaved?: () => void }) {
  const queryClient = useQueryClient();
  const fetchEntity = useServerFn(getCuratorialEntity);
  const saveEntity = useServerFn(updateCuratorialEntity);
  const removeEntity = useServerFn(deleteCuratorialEntity);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    fetchEntity({ data: { entityId } })
      .then((row) => {
        if (!active) return;
        setForm({
          entityType: asText(row.entity_type) || "obra",
          title: asText(row.title),
          slug: asText(row.slug),
          subtitle: asText(row.subtitle),
          description: asText(row.description),
          dateStart: asText(row.date_start),
          dateEnd: asText(row.date_end),
          dateDisplay: asText(row.date_display),
          location: asText(row.location),
          country: asText(row.country),
          continent: asText(row.continent),
          culture: asText(row.culture),
          regionId: asText(row.region_id),
          people: asText(row.people),
          cosmology: asText(row.cosmology),
          latitude: asText(row.latitude),
          longitude: asText(row.longitude),
          imageUrl: asText(row.image_url),
          imageLicense: asText(row.image_license),
          openImage: asBoolean(row.open_image),
          sourceUrl: asText(row.source_url),
          tags: arrayText(row.tags),
          themes: arrayText(row.themes),
          colors: arrayText(row.colors),
          materials: arrayText(row.materials),
          techniques: arrayText(row.techniques),
          metadataJson: jsonText(row.metadata),
          curatorialFacets: Array.isArray(row.curatorial_facets) ? row.curatorial_facets.map(String).filter((value): value is (typeof CURATORIAL_FACETS)[number]["id"] => CURATORIAL_FACETS.some((facet) => facet.id === value)) : [],
          status: (["draft", "review", "published", "archived"].includes(asText(row.status)) ? asText(row.status) : "review") as FormState["status"],
        });
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Não foi possível carregar o registro."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, entityId, fetchEntity]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["curadoria-imagens"] }),
      queryClient.invalidateQueries({ queryKey: ["curadoria-tainacan"] }),
      queryClient.invalidateQueries({ queryKey: ["quality-search"] }),
      queryClient.invalidateQueries({ queryKey: ["quality-issues"] }),
      queryClient.invalidateQueries({ queryKey: ["quality-category"] }),
      queryClient.invalidateQueries({ queryKey: ["quality-duplicates"] }),
      queryClient.invalidateQueries({ queryKey: ["acervo"] }),
      queryClient.invalidateQueries({ queryKey: ["acervo-page"] }),
      queryClient.invalidateQueries({ queryKey: ["atlas-entity-search"] }),
    ]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    let metadata: Record<string, unknown>;
    try {
      const parsed = JSON.parse(form.metadataJson || "{}");
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
      metadata = parsed as Record<string, unknown>;
    } catch {
      toast.error("Os metadados avançados precisam ser um objeto JSON válido.");
      return;
    }
    setSaving(true);
    try {
      await saveEntity({ data: {
        entityId,
        entityType: form.entityType,
        title: form.title,
        slug: form.slug,
        subtitle: form.subtitle,
        description: form.description,
        dateStart: nullableNumber(form.dateStart),
        dateEnd: nullableNumber(form.dateEnd),
        dateDisplay: form.dateDisplay,
        location: form.location,
        country: form.country,
        continent: form.continent,
        culture: form.culture,
        regionId: form.regionId,
        people: form.people,
        cosmology: form.cosmology,
        latitude: nullableNumber(form.latitude),
        longitude: nullableNumber(form.longitude),
        imageUrl: form.imageUrl,
        imageLicense: form.imageLicense,
        openImage: form.openImage,
        sourceUrl: form.sourceUrl,
        tags: split(form.tags),
        themes: split(form.themes),
        colors: split(form.colors),
        materials: split(form.materials),
        techniques: split(form.techniques),
        metadata,
        curatorialFacets: form.curatorialFacets,
        status: form.status,
      } });
      toast.success(form.status === "published" ? "Registro publicado." : "Campos curatoriais salvos.");
      setOpen(false);
      await invalidateAll();
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("Excluir definitivamente este registro do acervo? Relações e cartões de Atlas vinculados também serão removidos.")) return;
    setDeleting(true);
    try {
      await removeEntity({ data: { entityId } });
      toast.success("Registro excluído.");
      setOpen(false);
      await invalidateAll();
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o registro.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline"><Pencil className="mr-2 h-4 w-4" />Editar / revisar</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar campos curatoriais</DialogTitle>
          <DialogDescription>
            Revise dados, proveniência, imagem e status. Campos vazios são removidos do registro; os metadados originais do Tainacan permanecem no JSON até que você os edite.
          </DialogDescription>
        </DialogHeader>
        {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p> : (
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Tipo de registro *</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.entityType} onChange={(event) => set("entityType", event.target.value)}>
                  {[...new Set([...ENTITY_TYPES, form.entityType])].map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status *</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(event) => set("status", event.target.value as FormState["status"])}>
                  <option value="draft">Rascunho</option>
                  <option value="review">Em revisão</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
              <EditorField label="Título" value={form.title} onChange={(v) => set("title", v)} required />
              <EditorField label="Slug" value={form.slug} onChange={(v) => set("slug", v)} />
              <div className="md:col-span-2"><EditorField label="Subtítulo / autoria resumida" value={form.subtitle} onChange={(v) => set("subtitle", v)} /></div>
            </div>

            <EditorArea label="Descrição" value={form.description} onChange={(v) => set("description", v)} />

            <div className="grid gap-4 md:grid-cols-3">
              <EditorField label="Ano inicial" value={form.dateStart} onChange={(v) => set("dateStart", v)} inputMode="numeric" />
              <EditorField label="Ano final" value={form.dateEnd} onChange={(v) => set("dateEnd", v)} inputMode="numeric" />
              <EditorField label="Data / período exibido" value={form.dateDisplay} onChange={(v) => set("dateDisplay", v)} />
              <EditorField label="Local" value={form.location} onChange={(v) => set("location", v)} />
              <EditorField label="País / território" value={form.country} onChange={(v) => set("country", v)} />
              <EditorField label="Continente / região" value={form.continent} onChange={(v) => set("continent", v)} />
              <EditorField label="Cultura / contexto" value={form.culture} onChange={(v) => set("culture", v)} />
              <EditorField label="ID de região" value={form.regionId} onChange={(v) => set("regionId", v)} />
              <EditorField label="Povo / comunidade" value={form.people} onChange={(v) => set("people", v)} />
              <EditorField label="Cosmologia" value={form.cosmology} onChange={(v) => set("cosmology", v)} />
              <EditorField label="Latitude" value={form.latitude} onChange={(v) => set("latitude", v)} inputMode="decimal" />
              <EditorField label="Longitude" value={form.longitude} onChange={(v) => set("longitude", v)} inputMode="decimal" />
            </div>

            <section className="rounded-xl border p-4">
              <h3 className="font-medium">Imagem e proveniência</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <EditorField label="URL da imagem" value={form.imageUrl} onChange={(v) => set("imageUrl", v)} type="url" />
                <EditorField label="Licença / direitos da imagem" value={form.imageLicense} onChange={(v) => set("imageLicense", v)} />
                <div className="md:col-span-2"><EditorField label="URL da fonte" value={form.sourceUrl} onChange={(v) => set("sourceUrl", v)} type="url" /></div>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.openImage} onChange={(event) => set("openImage", event.target.checked)} />
                Marcar imagem como reutilizável/aberta somente quando a licença estiver confirmada
              </label>
              {form.imageUrl && <img src={form.imageUrl} alt="Prévia do registro" className="mt-4 max-h-72 rounded-lg border object-contain" />}
            </section>


            <section className="rounded-xl border p-4">
              <h3 className="font-medium">Lentes curatoriais do Atlas</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Atribuição manual. Use somente quando houver evidência documental suficiente; o Tainacan pode sugerir termos no JSON, mas não marca estas categorias automaticamente.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CURATORIAL_FACETS.map((facet) => (
                  <label key={facet.id} className="flex items-start gap-2 rounded-lg border border-border/60 p-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={form.curatorialFacets.includes(facet.id)}
                      onChange={(event) => set("curatorialFacets", event.target.checked
                        ? [...form.curatorialFacets, facet.id]
                        : form.curatorialFacets.filter((item) => item !== facet.id))}
                    />
                    <span>{facet.label}</span>
                  </label>
                ))}
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <EditorArea label="Tags" hint="separe por vírgulas, ponto e vírgula ou linhas" value={form.tags} onChange={(v) => set("tags", v)} rows={3} />
              <EditorArea label="Temas" hint="separe por vírgulas, ponto e vírgula ou linhas" value={form.themes} onChange={(v) => set("themes", v)} rows={3} />
              <EditorArea label="Cores" hint="separe por vírgulas, ponto e vírgula ou linhas" value={form.colors} onChange={(v) => set("colors", v)} rows={3} />
              <EditorArea label="Materiais" hint="separe por vírgulas, ponto e vírgula ou linhas" value={form.materials} onChange={(v) => set("materials", v)} rows={3} />
              <EditorArea label="Técnicas" hint="separe por vírgulas, ponto e vírgula ou linhas" value={form.techniques} onChange={(v) => set("techniques", v)} rows={3} />
            </div>

            <EditorArea
              label="Metadados avançados / proveniência (JSON)"
              hint="Aqui ficam o repositório Tainacan, coleção, ID do item, URL da API e os metadados originais. Você pode incluir, corrigir ou excluir chaves."
              value={form.metadataJson}
              onChange={(v) => set("metadataJson", v)}
              rows={16}
              mono
            />

            <div className="flex flex-col-reverse justify-between gap-3 border-t pt-4 sm:flex-row">
              <Button type="button" variant="destructive" onClick={onDelete} disabled={deleting || saving}>
                <Trash2 className="mr-2 h-4 w-4" />{deleting ? "Excluindo…" : "Excluir registro"}
              </Button>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving || deleting}>{saving ? "Salvando…" : form.status === "published" ? "Salvar e publicar" : "Salvar alterações"}</Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditorField({ label, value, onChange, required, type = "text", inputMode }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  const id = `curatorial-${label.replace(/\W/g, "-")}`;
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}{required ? " *" : ""}</Label><Input id={id} type={type} inputMode={inputMode} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></div>;
}

function EditorArea({ label, value, onChange, hint, rows = 5, mono = false }: { label: string; value: string; onChange: (value: string) => void; hint?: string; rows?: number; mono?: boolean }) {
  const id = `curatorial-${label.replace(/\W/g, "-")}`;
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}<Textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className={mono ? "font-mono text-xs" : ""} /></div>;
}
