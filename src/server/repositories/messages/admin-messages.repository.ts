import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { recordActivity } from "@/server/audit/activity-log";

export function listMessages(
  where: Prisma.MessageWhereInput,
  skip: number,
  take: number,
) {
  return prisma.$transaction([
    prisma.message.findMany({
      where,
      select: {
        id: true,
        name: true,
        contact: true,
        category: true,
        body: true,
        status: true,
        createdAt: true,
        handledAt: true,
        branch: { select: { id: true, name: true } },
        handledBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.message.count({ where }),
  ]);
}

export function findMessage(id: string, where: Prisma.MessageWhereInput) {
  return prisma.message.findFirst({
    where: { id, ...where },
    select: { id: true, branchId: true, status: true },
  });
}

export function updateMessageStatus(
  id: string,
  branchId: string | null,
  fromStatus: string,
  status: "new" | "in_progress" | "resolved" | "archived",
  actorUserId: string,
  handledAt: Date,
) {
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.message.update({
      where: { id },
      data: { status, handledById: actorUserId, handledAt },
      select: { status: true, handledAt: true },
    });
    await recordActivity({
      actorUserId,
      branchId: branchId ?? undefined,
      action: "message.status_updated",
      entityType: "message",
      entityId: id,
      metadata: { from_status: fromStatus, to_status: status },
    }, transaction);
    return updated;
  });
}
