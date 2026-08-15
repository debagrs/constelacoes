import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Sparkles } from "lucide-react";
import { submitContribution } from "@/lib/data/submissions.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/colabore")({ component: ColaborePage });
const split = (v: string) => v.split(/[;,\n]/).map((x) => x.trim()).filter(Boolean);

function ColaborePage() {
  const send = useServerFn(submitContribution);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ submissionType: "obra", title: "", artistName: "", subtitle: "", description: "", dateDisplay: "", location: "", country: "", continent: "", culture: "", imageUrl: "", imageSourceUrl: "", imageLicense: "", sourceUrls: "", tags: "", materials: "", techniques: "", marcadoresSociais: "", maternidades: "", povosComunidades: "", animalidades: "", bioetica: "", alemAntropoceno: "", sensorialidades: "", afetos: "", temporalidades: "", submitterName: "", submitterEmail: "", submitterRelation: "" });
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.title.trim().length < 2) nextErrors.title = "Informe um título com pelo menos 2 caracteres.";
    if (form.description.trim().length < 30) nextErrors.description = `Escreva pelo menos 30 caracteres. Faltam ${30 - form.description.trim().length}.`;
    if (form.submitterName.trim().length < 2) nextErrors.submitterName = "Informe seu nome.";
    if (!/^\S+@\S+\.\S+$/.test(form.submitterEmail.trim())) nextErrors.submitterEmail = "Informe um e-mail válido.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error("Revise os campos destacados antes de enviar.");
      document.getElementById(Object.keys(nextErrors)[0])?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      await send({ data: {
        submissionType: form.submissionType as any, title: form.title, artistName: form.artistName,
        subtitle: form.subtitle, description: form.description, dateDisplay: form.dateDisplay,
        location: form.location, country: form.country, continent: form.continent, culture: form.culture,
        imageUrl: form.imageUrl, imageSourceUrl: form.imageSourceUrl, imageLicense: form.imageLicense,
        sourceUrls: split(form.sourceUrls), tags: split(form.tags), materials: split(form.materials), techniques: split(form.techniques),
        sensitiveMetadata: { marcadores_sociais_autodeclarados: split(form.marcadoresSociais), maternidades_cuidados: split(form.maternidades), povos_comunidades: split(form.povosComunidades), animalidades_percepcao_animal: split(form.animalidades), bioetica: split(form.bioetica), alem_do_antropoceno: split(form.alemAntropoceno) },
        poeticMetadata: { sensorialidades: split(form.sensorialidades), afetos: split(form.afetos), temporalidades: split(form.temporalidades) },
        submitterName: form.submitterName, submitterEmail: form.submitterEmail,
        submitterRelation: form.submitterRelation, consentPublication: true,
      }});
      setErrors({}); setSent(true); toast.success("Contribuição enviada para a fila de curadoria.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível enviar.";
      toast.error(message);
      if (message.toLowerCase().includes("descrição")) setErrors((e) => ({ ...e, description: message }));
    }
    finally { setBusy(false); }
  }

  if (sent) return <Shell><div className="mx-auto max-w-2xl rounded-2xl border bg-card p-10 text-center"><Sparkles className="mx-auto h-9 w-9"/><h1 className="mt-4 font-display text-3xl font-semibold">Contribuição recebida</h1><p className="mt-3 text-muted-foreground">Ela ficará invisível ao público até ser revisada e aprovada pela curadoria do Atlas.</p><Button className="mt-6" onClick={() => setSent(false)}>Enviar outra</Button></div></Shell>;

  return <Shell><header className="max-w-3xl"><p className="text-eyebrow text-muted-foreground">Acervo vivo e moderado</p><h1 className="mt-2 font-display text-4xl font-semibold">Contribua com o Atlas Planetário</h1><p className="mt-4 text-muted-foreground">Cadastre obras, artistas, projetos, movimentos, práticas e imagens tradicionais ou situadas além do Antropoceno. Os campos sensíveis são opcionais, contextuais e nunca devem presumir identidades.</p></header>
  <form onSubmit={onSubmit} className="mt-10 space-y-10">
    <Section title="Identificação"><div className="grid gap-5 md:grid-cols-2"><SelectField label="Tipo" value={form.submissionType} onChange={(v)=>set("submissionType",v)}/><Field id="title" label="Título" value={form.title} onChange={(v)=>{set("title",v);setErrors((e)=>({...e,title:""}))}} required error={errors.title}/><Field label="Artista, autoria ou comunidade" value={form.artistName} onChange={(v)=>set("artistName",v)}/><Field label="Subtítulo" value={form.subtitle} onChange={(v)=>set("subtitle",v)}/><Field label="Data ou período" value={form.dateDisplay} onChange={(v)=>set("dateDisplay",v)}/><Field label="Cultura, povo ou contexto" value={form.culture} onChange={(v)=>set("culture",v)}/></div><Area id="description" label="Descrição curatorial" value={form.description} onChange={(v)=>{set("description",v);setErrors((e)=>({...e,description:""}))}} required error={errors.description} minLength={30} showCount/></Section>
    <Section title="Geografias e materialidades"><div className="grid gap-5 md:grid-cols-3"><Field label="Local" value={form.location} onChange={(v)=>set("location",v)}/><Field label="País ou território" value={form.country} onChange={(v)=>set("country",v)}/><Field label="Continente ou região" value={form.continent} onChange={(v)=>set("continent",v)}/></div><div className="grid gap-5 md:grid-cols-3"><Field label="Tags" hint="separe por vírgulas" value={form.tags} onChange={(v)=>set("tags",v)}/><Field label="Materiais" hint="separe por vírgulas" value={form.materials} onChange={(v)=>set("materials",v)}/><Field label="Técnicas" hint="separe por vírgulas" value={form.techniques} onChange={(v)=>set("techniques",v)}/></div></Section>
    <Section title="Metadados sensíveis e situados" description="Preencha somente quando houver autodeclaração, fonte confiável ou pertinência curatorial explícita. Não use estes campos para rotular pessoas por aparência."><div className="grid gap-5 md:grid-cols-2"><Field label="Marcadores sociais autodeclarados" hint="mulheres, pessoas negras, LGBTQIA+…" value={form.marcadoresSociais} onChange={(v)=>set("marcadoresSociais",v)}/><Field label="Maternidades e práticas de cuidado" value={form.maternidades} onChange={(v)=>set("maternidades",v)}/><Field label="Povos, comunidades e pertencimentos" value={form.povosComunidades} onChange={(v)=>set("povosComunidades",v)}/><Field label="Animalidades e percepção animal" value={form.animalidades} onChange={(v)=>set("animalidades",v)}/><Field label="Bioética" value={form.bioetica} onChange={(v)=>set("bioetica",v)}/><Field label="Além do Antropoceno" hint="plantationoceno, chthuluceno, simbioceno…" value={form.alemAntropoceno} onChange={(v)=>set("alemAntropoceno",v)}/></div></Section>
    <Section title="Metadados poéticos"><div className="grid gap-5 md:grid-cols-3"><Field label="Sensorialidades" value={form.sensorialidades} onChange={(v)=>set("sensorialidades",v)}/><Field label="Afetos e intensidades" value={form.afetos} onChange={(v)=>set("afetos",v)}/><Field label="Temporalidades" value={form.temporalidades} onChange={(v)=>set("temporalidades",v)}/></div></Section>
    <Section title="Imagem, licença e fontes"><div className="grid gap-5 md:grid-cols-2"><Field label="URL direta da imagem" type="url" value={form.imageUrl} onChange={(v)=>set("imageUrl",v)}/><Field label="Página de origem da imagem" type="url" value={form.imageSourceUrl} onChange={(v)=>set("imageSourceUrl",v)}/><Field label="Licença" hint="Domínio público, CC BY, CC BY-SA…" value={form.imageLicense} onChange={(v)=>set("imageLicense",v)}/><Field label="Outras fontes" hint="URLs separadas por vírgulas" value={form.sourceUrls} onChange={(v)=>set("sourceUrls",v)}/></div></Section>
    <Section title="Responsabilidade pelo envio"><div className="grid gap-5 md:grid-cols-2"><Field id="submitterName" label="Seu nome" value={form.submitterName} onChange={(v)=>{set("submitterName",v);setErrors((e)=>({...e,submitterName:""}))}} required error={errors.submitterName}/><Field id="submitterEmail" label="Seu e-mail" type="email" value={form.submitterEmail} onChange={(v)=>{set("submitterEmail",v);setErrors((e)=>({...e,submitterEmail:""}))}} required error={errors.submitterEmail}/></div><Area label="Relação com a obra, artista ou comunidade" value={form.submitterRelation} onChange={(v)=>set("submitterRelation",v)}/><p className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">Ao enviar, você declara que as informações foram fornecidas de boa-fé e autoriza sua publicação após revisão. A curadoria pode editar, pedir complementos, recusar ou retirar conteúdos inadequados.</p></Section>
    <Button type="submit" size="lg" disabled={busy}><Send className="mr-2 h-4 w-4"/>{busy ? "Enviando…" : "Enviar para curadoria"}</Button>
  </form></Shell>;
}
function Shell({children}:{children:React.ReactNode}){return <div className="flex min-h-screen flex-col"><SiteHeader/><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">{children}</main><SiteFooter/></div>}
function Section({title,description,children}:{title:string;description?:string;children:React.ReactNode}){return <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-7"><h2 className="font-display text-2xl font-semibold">{title}</h2>{description&&<p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>}<div className="mt-5 space-y-5">{children}</div></section>}
function Field({id:givenId,label,hint,value,onChange,required,type="text",error}:{id?:string;label:string;hint?:string;value:string;onChange:(v:string)=>void;required?:boolean;type?:string;error?:string}){const id=givenId??label.replace(/\W/g,"-");return <div className="space-y-1.5"><Label htmlFor={id}>{label}{required?" *":""}</Label>{hint&&<p className="text-xs text-muted-foreground">{hint}</p>}<Input id={id} type={type} value={value} required={required} aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined} className={error?"border-destructive focus-visible:ring-destructive":""} onChange={(e)=>onChange(e.target.value)}/>{error&&<p id={`${id}-error`} className="text-sm font-medium text-destructive">{error}</p>}</div>}
function Area({id:givenId,label,value,onChange,required,error,minLength,showCount}:{id?:string;label:string;value:string;onChange:(v:string)=>void;required?:boolean;error?:string;minLength?:number;showCount?:boolean}){const id=givenId??label.replace(/\W/g,"-");return <div className="space-y-1.5"><div className="flex items-center justify-between gap-4"><Label htmlFor={id}>{label}{required?" *":""}</Label>{showCount&&<span className={`text-xs ${minLength&&value.trim().length<minLength?"text-destructive":"text-muted-foreground"}`}>{value.trim().length}{minLength?` / mínimo ${minLength}`:""}</span>}</div><Textarea id={id} value={value} required={required} rows={5} minLength={minLength} aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined} className={error?"border-destructive focus-visible:ring-destructive":""} onChange={(e)=>onChange(e.target.value)}/>{error&&<p id={`${id}-error`} className="text-sm font-medium text-destructive">{error}</p>}</div>}
function SelectField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <div className="space-y-1.5"><Label>{label}</Label><select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(e)=>onChange(e.target.value)}>{["obra","artista","projeto","movimento","conceito","objeto","arquitetura","design","performance","fotografia","filme","jogo","interface","outro"].map(x=><option key={x} value={x}>{x}</option>)}</select></div>}
