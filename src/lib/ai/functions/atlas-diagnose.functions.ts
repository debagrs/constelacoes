import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAIProvider } from "../provider";
import { AtlasDiagnosisSchema, type AtlasDiagnosis } from "../schemas/cocuradoria";
import {
  COCURADORIA_SYSTEM_PROMPT,
  buildAtlasDiagnosisPrompt,
} from "../prompts/cocuradoria";

const Input = z.object({ atlasId: z.string().uuid() });

export const diagnoseAtlas = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { requireUser, isReviewer } = await import("@/lib/auth/session.server");
    const { query, queryOne, execute, nowIso } = await import("@/lib/turso/client.server");
    const { toBool } = await import("@/lib/turso/rows");
    const user = await requireUser();
    const userId = user.id;

    const atlasRow = await queryOne<{
      id: string;
      title: string;
      description: string | null;
      owner_id: string;
      status: string;
      is_public: number;
    }>(
      "SELECT id, title, description, owner_id, status, is_public FROM atlases WHERE id = ?",
      [data.atlasId],
    );
    if (!atlasRow) throw new Error("Atlas não encontrado");
    const atlas = { ...atlasRow, is_public: toBool(atlasRow.is_public) };

    const canAccess =
      atlas.owner_id === userId ||
      atlas.is_public ||
      atlas.status === "published" ||
      isReviewer(user);
    if (!canAccess) {
      throw new Error("Você não tem permissão para diagnosticar este atlas");
    }

    const cards = await query<{ entity_id: string | null }>(
      "SELECT entity_id FROM atlas_cards WHERE atlas_id = ?",
      [data.atlasId],
    );
    const entityIds = cards
      .map((c) => c.entity_id)
      .filter((id): id is string => Boolean(id));
    if (entityIds.length === 0) {
      throw new Error("Atlas não possui entidades para diagnóstico");
    }

    const entities = await query<{
      id: string;
      title: string;
      entity_type: string;
      date_display: string | null;
      date_start: number | null;
      date_end: number | null;
      country: string | null;
      continent: string | null;
      culture: string | null;
    }>(
      `SELECT id, title, entity_type, date_display, date_start, date_end, country, continent, culture
         FROM entities WHERE id IN (${entityIds.map(() => "?").join(",")})`,
      entityIds,
    );

    const provider = await createAIProvider();

    const result = await provider.generateStructuredResponse<AtlasDiagnosis>(
      {
        system: COCURADORIA_SYSTEM_PROMPT,
        user: buildAtlasDiagnosisPrompt(atlas, entities),
        temperature: 0.3,
        maxTokens: 4096,
      },
      {
        name: "atlas_diagnosis",
        schema: {
          type: "object",
          properties: {
            diagnosis: {
              type: "object",
              properties: {
                summary: { type: "string" },
                biases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: [
                          "eurocentrism",
                          "chronological_concentration",
                          "geographic_concentration",
                          "gender_gap",
                          "absence",
                          "anachronism",
                          "weak_relation",
                        ],
                      },
                      description: { type: "string" },
                      severity: { type: "string", enum: ["low", "medium", "high"] },
                    },
                    required: ["type", "description", "severity"],
                  },
                },
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      entity_id: { type: "string" },
                      relation_type: { type: "string" },
                      justification: { type: "string" },
                      limitations: { type: "array", items: { type: "string" } },
                      sources: { type: "array", items: { type: "string" } },
                      confidence: { type: "number" },
                    },
                    required: [
                      "entity_id",
                      "relation_type",
                      "justification",
                      "limitations",
                      "sources",
                      "confidence",
                    ],
                  },
                },
                questions: { type: "array", items: { type: "string" } },
              },
              required: ["summary", "biases", "suggestions", "questions"],
            },
          },
          required: ["diagnosis"],
        },
      }
    );

    const parsed = AtlasDiagnosisSchema.parse(result);

    const proposalId = crypto.randomUUID();
    const now = nowIso();
    await execute(
      `INSERT INTO ai_proposals
         (id, user_id, target_type, target_id, proposal_type, payload, status, created_at, updated_at)
       VALUES (?, ?, 'atlas', ?, 'atlas_diagnosis', ?, 'pending', ?, ?)`,
      [
        proposalId,
        userId,
        atlas.id,
        JSON.stringify({ atlas_title: atlas.title, diagnosis: parsed.diagnosis }),
        now,
        now,
      ],
    );

    return {
      proposal_id: proposalId,
      atlas_id: atlas.id,
      atlas_title: atlas.title,
      diagnosis: parsed.diagnosis,
      generated_by: userId,
      reviewed: false,
    };
  });
