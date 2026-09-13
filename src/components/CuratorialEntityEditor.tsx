import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { getCuratorialEntity, updateCuratorialEntity } from "@/lib/data/curadoria.functions";
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

type FormState = {
  entityType: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  dateDisplay: string;
  location: string;
  country: string;
  continent: string;
  culture: string;
  regionId: string;
  people: string;
  cosmology: string;
  imageLicense: string;
  sourceUrl: string;
  tags: string;
  themes: string;
  colors: string;
  materials: string;
  techniques: string;
  metadataJson: string;
};

const emptyForm: FormState = {
  entityType: "",
  title: "",
  slug: "",
  subtitle: "",
  description: "",
  dateDisplay: "",
  location: "",
  country: "",
  continent: "",
  culture: "",
  regionId: "",
  people: "",
  cosmology: "",
  imageLicense: "",
  sourceUrl: "",
  tags: "",
  themes: "",
  colors: "",
  materials: "",
  techniques: "",
  metadataJson: "{}",
};

export function CuratorialEntityEditor({ entityId, onSaved }: { entityId: string; onSaved?: () => void }) {
  const queryClient = useQueryClient();
  const fetchEntity = useServerFn(getCuratorialEntity);
  const saveEntity = useServerFn(updateCuratorialEntity);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    fetchEntity({ data: { entityId } })
      .then((row) => {
        if (!active) return;
        setForm({
          entityType: asText(row.entity_type),
          title: asText(row.title),
          slug: asText(row.slug),
          subtitle: asText(row.subtitle),
          description: asText(row.description),
          dateDisplay: asText(row.date_display),
          location: asText(row.location),
          country: asText(row.country),
          continent: asText(row.continent),
          culture: asText(row.culture),
          regionId: asText(row.region_id),
          people: asText(row.people),
          cosmology: asText(row.cosmology),
          imageLicense: asText(row.image_license),
          sourceUrl: asText(row.source_url),
          tags: arrayText(row.tags),
          themes: arrayText(row.themes),
          colors: arrayText(row.colors),
          materials: arrayText(row.materials),
          techniques: arrayText(row.techniques),
          metadataJson: jsonText(row.metadata),
        });
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Não foi possível carregar o registro."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, entityId, fetchEntity]);

  const set = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: React.FormEvent) {
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
        dateDisplay: form.dateDisplay,
        location: form.location,
        country: form.country,
        continent: form.continent,
        culture: form.culture,
        regionId: form.regionId,
        people: form.people,
        cosmology: form.cosmology,
        imageLicense: form.imageLicense,
        sourceUrl: form.sourceUrl,
        tags: split(form.tags),
        themes: split(form.themes),
        colors: split(form.colors),
        materials: split(form.materials),
        techniques: split(form.techniques),
        metadata,
      } });
      toast.success("Campos curatoriais salvos.");
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["curadoria-imagens"] }),
        queryClient.invalidateQueries({ queryKey: ["quality-search"] }),
        queryClient.invalidateQueries({ queryKey: ["quality-issues"] }),
        queryClient.invalidateQueries({ queryKey: ["quality-category"] }),
        queryClient.invalidateQueries({ queryKey: ["quality-duplicates"] }),
        queryClient.invalidateQueries({ queryKey: ["acervo"] }),
      ]);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline"><Pencil className="mr-2 h-4 w-4" />Editar todos os textos</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar campos curatoriais</DialogTitle>
          <DialogDescription>Altere os campos textuais do registro antes de mantê-lo no acervo.</DialogDescription>
        </DialogHeader>
        {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p> : (
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <EditorField label="Tipo de registro" value={form.entityType} onChange={(v) => set("entityType", v)} required />
              <EditorField label="Título" value={form.title} onChange={(v) => set("title", v)} required />
              <EditorField label="Slug" value={form.slug} onChange={(v) => set("slug", v)} />
              <EditorField label="Subtítulo" value={form.subtitle} onChange={(v) => set("subtitle", v)} />
            </div>
            <EditorArea label="Descrição" value={form.description} onChange={(v) => set("description", v)} />
            <div className="grid gap-4 md:grid-cols-3">
              <EditorField label="Data / período" value={form.dateDisplay} onChange={(v) => set("dateDisplay", v)} />
              <EditorField label="Local" value={form.location} onChange={(v) => set("location", v)} />
              <EditorField label="País / território" value={form.country} onChange={(v) => set("country", v)} />
              <EditorField label="Continente / região" value={form.continent} onChange={(v) => set("continent", v)} />
              <EditorField label="Cultura / contexto" value={form.culture} onChange={(v) => set("culture", v)} />
              <EditorField label="ID de região" value={form.regionId} onChange={(v) => set("regionId", v)} />
              <EditorField label="Povo / comunidade" value={form.people} onChange={(v) => set("people", v)} />
              <EditorField label="Cosmologia" value={form.cosmology} onChange={(v) => set("cosmology", v)} />
              <EditorField label="Licença da imagem" value={form.imageLicense} onChange={(v) => set("imageLicense", v)} />
            </div>
            <EditorField label="URL da fonte" value={form.sourceUrl} onChange={(v) => set("sourceUrl", v)} type="url" />
            <div className="grid gap-4 md:grid-cols-2">
              <EditorArea label="Tags" hint="separe por vírgulas, ponto e vírgula ou linhas" value={form.tags} onChange={(v) => set("tags", v)} rows={3} />
              <EditorArea label="Temas" hint="separe por vírgulas, ponto e vírgula ou linhas" value={form.themes} onChange={(v) => set("themes", v)} rows={3} />
              <EditorArea label="Cores" hint="separe por vírgulas, ponto e vírgula ou linhas" value={form.colors} onChange={(v) => set("colors", v)} rows={3} />
              <EditorArea label="Materiais" hint="separe por vírgulas, ponto e vírgula ou linhas" value={form.materials} onChange={(v) => set("materials", v)} rows={3} />
              <EditorArea label="Técnicas" hint="separe por vírgulas, ponto e vírgula ou linhas" value={form.techniques} onChange={(v) => set("techniques", v)} rows={3} />
            </div>
            <EditorArea label="Metadados avançados (JSON)" hint="Mantém editáveis também os campos textuais especiais que não têm campo próprio na interface." value={form.metadataJson} onChange={(v) => set("metadataJson", v)} rows={12} mono />
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditorField({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  const id = `curatorial-${label.replace(/\W/g, "-")}`;
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}{required ? " *" : ""}</Label><Input id={id} type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></div>;
}

function EditorArea({ label, value, onChange, hint, rows = 5, mono = false }: { label: string; value: string; onChange: (value: string) => void; hint?: string; rows?: number; mono?: boolean }) {
  const id = `curatorial-${label.replace(/\W/g, "-")}`;
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}<Textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className={mono ? "font-mono text-xs" : ""} /></div>;
}
