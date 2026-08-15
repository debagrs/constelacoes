import type { AIProvider, AIRequest } from "../provider";

const OPENAI_BASE_URL = "https://api.openai.com/v1";

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY não configurada");
    }
    this.apiKey = key;
    this.model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: "Say OK" }],
          max_tokens: 5,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = body?.error?.message ?? `HTTP ${response.status}`;
        return { ok: false, error: message };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async generateStructuredResponse<T>(
    input: AIRequest,
    schema: { name: string; schema: object }
  ): Promise<T> {
    const response = await this.callChat(input, {
      type: "json_schema",
      json_schema: {
        name: schema.name,
        strict: true,
        schema: schema.schema,
      },
    });

    return this.parseStructured<T>(response, schema.name);
  }

  async analyzeContext<T>(
    input: AIRequest,
    schema: { name: string; schema: object }
  ): Promise<T> {
    return this.generateStructuredResponse<T>(input, schema);
  }

  async *streamResponse(input: AIRequest): AsyncIterable<string> {
    const response = await this.callChat(input, undefined, true);
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // ignore malformed SSE chunks
        }
      }
    }
  }

  private async callChat(
    input: AIRequest,
    responseFormat?:
      | { type: "json_object" }
      | { type: "json_schema"; json_schema: { name: string; strict: boolean; schema: object } },
    stream = false
  ): Promise<Response> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 2048,
      stream,
    };

    if (responseFormat) {
      body.response_format = responseFormat;
    }

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = errorBody?.error?.message ?? `OpenAI error: HTTP ${response.status}`;
      throw new Error(message);
    }

    return response;
  }

  private async parseStructured<T>(response: Response, schemaName: string): Promise<T> {
    const body = await response.json();
    const content = body?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error(`Resposta vazia de ${schemaName}`);
    }

    try {
      return JSON.parse(content) as T;
    } catch {
      throw new Error(`JSON inválido de ${schemaName}`);
    }
  }
}
