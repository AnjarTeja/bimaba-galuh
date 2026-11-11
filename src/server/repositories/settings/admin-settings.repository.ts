import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { recordActivity } from "@/server/audit/activity-log";

export function listAdminSettings(keys: string[]) {
  return prisma.appSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true, updatedAt: true },
    orderBy: { key: "asc" },
  });
}

export function updateAdminSettings(
  entries: Array<[string, Prisma.InputJsonValue]>,
  actorUserId: string,
) {
  return prisma.$transaction(async (transaction) => {
    for (const [key, value] of entries) {
      await transaction.appSetting.upsert({
        where: { key },
        create: { key, value, updatedById: actorUserId },
        update: { value, updatedById: actorUserId },
      });
    }
    await recordActivity({
      actorUserId,
      action: "settings.updated",
      entityType: "app_setting",
      metadata: { keys: entries.map(([key]) => key) },
    }, transaction);
  });
}
