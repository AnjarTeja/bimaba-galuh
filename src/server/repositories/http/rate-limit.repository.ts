import { prisma } from "@/server/db/prisma";

export function incrementRateLimitBucket(input: {
  id: string;
  expiresAt: Date;
}) {
  return prisma.rateLimitBucket.upsert({
    where: { id: input.id },
    create: { id: input.id, count: 1, expiresAt: input.expiresAt },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
}
