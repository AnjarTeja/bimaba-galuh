import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export function listActivityLogs(
  where: Prisma.ActivityLogWhereInput,
  skip: number,
  take: number,
) {
  return prisma.$transaction([
    prisma.activityLog.findMany({
      where,
      select: {
        id: true,
        actorUserId: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { fullName: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.activityLog.count({ where }),
  ]);
}
