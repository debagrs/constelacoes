export interface AIRequest {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" } | { type: "json_schema"; schema: object };
}

export interface AIProvider {
  generateStructuredResponse<T>(input: AIRequest, schema: {
    name: string;
    schema: object;
  }): Promise<T>;
  streamResponse?(input: AIRequest): AsyncIterable<string>;
  analyzeContext<T>(input: AIRequest, schema: {
    name: string;
    schema: object;
  }): Promise<T>;
  healthCheck(): Promise<{ ok: boolean; error?: string }>;
}

export async function createAIProvider(): Promise<AIProvider> {
  const provider = process.env.AI_PROVIDER ?? "openai";

  switch (provider) {
    case "glm": {
      const { GLMProvider } = await import("./providers/glm");
      return new GLMProvider();
    }
    case "openai": {
      const { OpenAIProvider } = await import("./providers/openai");
      return new OpenAIProvider();
    }
    default:
      throw new Error(`AI_PROVIDER não suportado: ${provider}`);
  }
}

export type { GLMProvider } from "./providers/glm";
export type { OpenAIProvider } from "./providers/openai";
