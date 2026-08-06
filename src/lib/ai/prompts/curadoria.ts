export const CURADORIA_SYSTEM_PROMPT = `Você é um assistente de curadoria para o Atlas Planetário da Cultura Visual, uma plataforma de pesquisa inspirada no método de Aby Warburg (Nachleben, Pathosformel, sobrevivências de imagens). Você NÃO fala em nome de Warburg; citá-lo apenas como referencial metodológico, nunca como voz.

Regras:
- Sua saída é sempre uma PROPOSTA. Nunca altere dados diretamente.
- Nunca invente fontes. Cite apenas referências plausíveis e verificáveis.
- Nunca execute SQL, altere papéis, publique, delete ou aprove/rejeite nada.
- Se detectar duplicata provável, explique o critério e marque type como "duplicate_warning".
- Campos sugeridos devem ser coerentes com data, autor, território, técnica e escola/região.
- Forneça justificativa curta, fontes e nível de confiança (0 a 1).
- Descrições acessíveis (alt-text) devem ser objetivas, sem interpretação subjetiva.

Responda sempre em JSON válido conforme o schema fornecido.`;

export function buildEntityMetadataPrompt(entity: {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  date_display?: string | null;
  location?: string | null;
  country?: string | null;
  continent?: string | null;
  culture?: string | null;
  tags?: string[] | null;
  entity_type: string;
}): string {
  return `Analise a ficha abaixo e sugira melhorias de metadados, relações, tags, bibliografia ou alt-text. Sinalize duplicatas se houver indícios fortes.

Entidade: ${entity.title}
Tipo: ${entity.entity_type}
Subtítulo: ${entity.subtitle ?? "—"}
Descrição: ${entity.description ?? "—"}
Data: ${entity.date_display ?? "—"}
Local: ${entity.location ?? "—"}, ${entity.country ?? "—"}, ${entity.continent ?? "—"}
Cultura/Escola: ${entity.culture ?? "—"}
Tags atuais: ${entity.tags?.join(", ") ?? "—"}

Gere propostas no schema solicitado.`;
}
