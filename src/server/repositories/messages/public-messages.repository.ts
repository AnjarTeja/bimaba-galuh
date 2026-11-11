import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { recordActivity } from "@/server/audit/activity-log";

export function findAvailableBranch(id: string) {
  return prisma.branch.findFirst({
    where: { id, active: true, verified: true },
    select: { id: true },
  });
}

export function createPublicMessage(input: {
  name: string;
  contact: string;
  category: string;
  branchId?: string;
  body: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const message = await transaction.message.create({
      data: {
        name: input.name,
        contact: input.contact,
        category: input.category,
        branchId: input.branchId,
        body: input.body,
      },
      select: { id: true, createdAt: true },
    });
    await recordActivity(
      {
        branchId: input.branchId,
        action: "message.contact_consent",
        entityType: "message",
        entityId: message.id,
        metadata: {
          consented: true,
          consented_at: new Date().toISOString(),
        } satisfies Prisma.InputJsonValue,
      },
      transaction,
    );
    return message;
  });
}
