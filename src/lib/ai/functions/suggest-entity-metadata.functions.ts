import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAIProvider } from "../provider";
import { CuradoriaProposalSchema, type CuradoriaProposal } from "../schemas/curadoria";
import {
  CURADORIA_SYSTEM_PROMPT,
  buildEntityMetadataPrompt,
} from "../prompts/curadoria";

const Input = z.object({ entityId: z.string().uuid() });

export const suggestEntityMetadata = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { requireUser, isReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, execute, nowIso } = await import("@/lib/turso/client.server");
    const user = await requireUser();
    const userId = user.id;

    const entity = await queryOne<{
      id: string;
      title: string;
      subtitle: string | null;
      description: string | null;
      date_display: string | null;
      location: string | null;
      country: string | null;
      continent: string | null;
      culture: string | null;
      tags: string | null;
      entity_type: string;
      created_by: string | null;
      status: string;
    }>(
      `SELECT id, title, subtitle, description, date_display, location, country,
              continent, culture, tags, entity_type, created_by, status
         FROM entities WHERE id = ?`,
      [data.entityId],
    );

    if (!entity) {
      throw new Error("Entidade não encontrada");
    }

    if (entity.created_by !== userId && !isReviewer(user)) {
      throw new Error("Você não tem permissão para sugerir metadados desta entidade");
    }

    const provider = await createAIProvider();

    const result = await provider.generateStructuredResponse<CuradoriaProposal>(
      {
        system: CURADORIA_SYSTEM_PROMPT,
        user: buildEntityMetadataPrompt({
          ...entity,
          tags: JSON.parse(entity.tags ?? "[]") as string[],
        }),
        temperature: 0.2,
        maxTokens: 2048,
      },
      {
        name: "curadoria_proposal",
        schema: {
          type: "object",
          properties: {
            proposals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  current_value: { type: ["string", "null"] },
                  suggested_value: { type: "string" },
                  justification: { type: "string" },
                  type: {
                    type: "string",
                    enum: ["metadata", "relation", "tag", "bibliography", "alt_text", "duplicate_warning"],
                  },
                  sources: { type: "array", items: { type: "string" } },
                  confidence: { type: "number" },
                  risks: { type: "array", items: { type: "string" } },
                },
                required: [
                  "field",
                  "current_value",
                  "suggested_value",
                  "justification",
                  "type",
                  "sources",
                  "confidence",
                  "risks",
                ],
              },
            },
          },
          required: ["proposals"],
        },
      }
    );

    const parsed = CuradoriaProposalSchema.parse(result);

    const proposalId = crypto.randomUUID();
    const now = nowIso();
    await execute(
      `INSERT INTO ai_proposals
         (id, user_id, target_type, target_id, proposal_type, payload, status, created_at, updated_at)
       VALUES (?, ?, 'entity', ?, 'metadata_suggestions', ?, 'pending', ?, ?)`,
      [
        proposalId,
        userId,
        entity.id,
        JSON.stringify({
          entity_title: entity.title,
          entity_type: entity.entity_type,
          proposals: parsed.proposals,
        }),
        now,
        now,
      ],
    );

    return {
      proposal_id: proposalId,
      entity_id: entity.id,
      entity_title: entity.title,
      proposals: parsed.proposals,
      generated_by: userId,
      reviewed: false,
    };
  });
