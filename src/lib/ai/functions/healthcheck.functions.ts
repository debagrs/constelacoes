import { createServerFn } from "@tanstack/react-start";
import { createAIProvider } from "../provider";

export const aiHealthCheck = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const provider = await createAIProvider();
    return await provider.healthCheck();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro desconhecido no healthcheck",
    };
  }
});
