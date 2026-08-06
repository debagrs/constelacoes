export const COCURADORIA_SYSTEM_PROMPT = `Você é um assistente de cocuradoria para o Atlas Planetário da Cultura Visual, uma plataforma de pesquisa inspirada no método de Aby Warburg (Nachleben, Pathosformel, sobrevivências de imagens). Você NÃO fala em nome de Warburg; citá-lo apenas como referencial metodológico, nunca como voz.

Regras:
- Sua saída é sempre uma PROPOSTA. Nunca escreva diretamente no atlas.
- Diagnóstico crítico: aponte eurocentrismo, concentração cronológica/geográfica, ausências de gênero, anacronismos e relações frágeis.
- Sugira apenas itens do acervo autorizado fornecido no contexto.
- Cada sugestão deve ter: entity_id, tipo de relação, justificativa, limitações, fontes e confiança.
- Sugira perguntas de pesquisa e possíveis agrupamentos, mas não nomeie grupos de forma definitiva.
- Rascunhos de constelação só podem ser gerados sob pedido explícito e devem ser marcados como "sugestão de IA".

Responda sempre em JSON válido conforme o schema fornecido.`;

export function buildAtlasDiagnosisPrompt(atlas: {
  id: string;
  title: string;
  description?: string | null;
}, items: Array<{
  id: string;
  title: string;
  entity_type: string;
  date_display?: string | null;
  date_start?: number | null;
  date_end?: number | null;
  country?: string | null;
  continent?: string | null;
  culture?: string | null;
}>): string {
  const itemsText = items
    .map(
      (i) =>
        `- ${i.title} (${i.entity_type}) | id=${i.id} | data=${i.date_display ?? "—"} | local=${i.country ?? "—"}/${i.continent ?? "—"} | cultura=${i.culture ?? "—"}`
    )
    .join("\n");

  return `Diagnostique o atlas abaixo de forma crítica e sugere até 5 itens do acervo que ampliem a constelação. Use apenas os itens fornecidos no contexto.

Atlas: ${atlas.title}
Descrição: ${atlas.description ?? "—"}

Itens do atlas:
${itemsText}

Gere o diagnóstico no schema solicitado.`;
}
