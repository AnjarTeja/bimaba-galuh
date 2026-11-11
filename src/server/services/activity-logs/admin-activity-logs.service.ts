import type { z } from "zod";
import { ActivityLogQuerySchema } from "@/contracts/activity-logs";
import { getBranchFilter } from "@/server/auth/branch-scope";
import type { AuthenticatedSession } from "@/server/auth/session";
import { listActivityLogs } from "@/server/repositories/activity-logs/admin-activity-logs.repository";

type ActivityLogQuery = z.infer<typeof ActivityLogQuerySchema>;

export async function listAdminActivityLogs(
  query: ActivityLogQuery,
  page: { skip: number; take: number },
  session: AuthenticatedSession,
) {
  const where = {
    ...getBranchFilter(session, query.branch_id),
    ...(query.actor_user_id ? { actorUserId: query.actor_user_id } : {}),
    ...(query.entity_type ? { entityType: query.entity_type } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };
  const [logs, total] = await listActivityLogs(where, page.skip, page.take);
  return {
    logs: logs.map(({ actorUserId, entityType, entityId, createdAt, actor, ...log }) => ({
      ...log,
      actor_user_id: actorUserId,
      actor_name: actor?.fullName ?? null,
      entity_type: entityType,
      entity_id: entityId,
      created_at: createdAt.toISOString(),
    })),
    total,
  };
}
