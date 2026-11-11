import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";

type ActivityClient = Pick<Prisma.TransactionClient, "activityLog">;

export type ActivityLogInput = {
  actorUserId?: string;
  branchId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

export function recordActivity(
  input: ActivityLogInput,
  client: ActivityClient = prisma,
) {
  return client.activityLog.create({
    data: {
      actorUserId: input.actorUserId,
      branchId: input.branchId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
    },
  });
}
