import { z } from "zod";

export const AtlasDiagnosisSchema = z.object({
  diagnosis: z.object({
    summary: z.string(),
    biases: z.array(
      z.object({
        type: z.enum(["eurocentrism", "chronological_concentration", "geographic_concentration", "gender_gap", "absence", "anachronism", "weak_relation"]),
        description: z.string(),
        severity: z.enum(["low", "medium", "high"]),
      })
    ),
    suggestions: z.array(
      z.object({
        entity_id: z.string().uuid(),
        relation_type: z.string(),
        justification: z.string(),
        limitations: z.array(z.string()),
        sources: z.array(z.string()),
        confidence: z.number(),
      })
    ),
    questions: z.array(z.string()),
  }),
});

export type AtlasDiagnosis = z.infer<typeof AtlasDiagnosisSchema>;
