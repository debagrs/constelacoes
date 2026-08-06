import { z } from "zod";

export const CuradoriaProposalSchema = z.object({
  proposals: z.array(
    z.object({
      field: z.string(),
      current_value: z.string().nullable(),
      suggested_value: z.string(),
      justification: z.string(),
      type: z.enum(["metadata", "relation", "tag", "bibliography", "alt_text", "duplicate_warning"]),
      sources: z.array(z.string()),
      confidence: z.number(),
      risks: z.array(z.string()),
    })
  ),
});

export type CuradoriaProposal = z.infer<typeof CuradoriaProposalSchema>;
