import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ListInput = z.object({
  targetType: z.enum(["entity", "atlas"]).optional(),
  targetId: z.string().uuid().optional(),
  status: z.enum(["pending", "accepted", "rejected", "edited"]).optional(),
  limit: z.number().min(1).max(100).default(50),
});

export const listAIProposals = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ListInput.parse(input))
  .handler(async ({ data }) => {
    const { requireUser, isReviewer } = await import("@/lib/auth/session.server");
    const { query } = await import("@/lib/turso/client.server");
    const user = await requireUser();

    const where: string[] = [];
    const args: (string | number)[] = [];
    if (!isReviewer(user)) {
      where.push("user_id = ?");
      args.push(user.id);
    }
    if (data.targetType) {
      where.push("target_type = ?");
      args.push(data.targetType);
    }
    if (data.targetId) {
      where.push("target_id = ?");
      args.push(data.targetId);
    }
    if (data.status) {
      where.push("status = ?");
      args.push(data.status);
    }
    args.push(data.limit);

    return await query<Record<string, string | number | null>>(
      `SELECT * FROM ai_proposals
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY created_at DESC LIMIT ?`,
      args,
    );
  });

const DecisionInput = z.object({
  proposalId: z.string().uuid(),
  action: z.enum(["accept", "reject", "edit"]),
  diff: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

export const applyAIDecision = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DecisionInput.parse(input))
  .handler(async ({ data }) => {
    const { requireUser, isReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, batch, nowIso } = await import("@/lib/turso/client.server");
    const user = await requireUser();

    const proposal = await queryOne<{ id: string; user_id: string }>(
      "SELECT id, user_id FROM ai_proposals WHERE id = ?",
      [data.proposalId],
    );
    if (!proposal) throw new Error("Proposta não encontrada");
    if (proposal.user_id !== user.id && !isReviewer(user)) {
      throw new Error("Você não tem permissão para decidir sobre esta proposta");
    }

    const newStatus =
      data.action === "accept"
        ? "accepted"
        : data.action === "reject"
          ? "rejected"
          : "edited";
    const now = nowIso();

    await batch([
      {
        sql: "UPDATE ai_proposals SET status = ?, review_notes = ?, updated_at = ? WHERE id = ?",
        args: [newStatus, data.notes ?? null, now, data.proposalId],
      },
      {
        sql: `INSERT INTO ai_decisions (id, proposal_id, user_id, action, diff, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          crypto.randomUUID(),
          data.proposalId,
          user.id,
          data.action,
          JSON.stringify(data.diff ?? {}),
          data.notes ?? null,
          now,
        ],
      },
    ]);

    return { success: true, status: newStatus };
  });
