import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export function findIdempotencyRecord(scope: string, key: string) {
  return prisma.idempotencyRecord.findUnique({
    where: { scope_key: { scope, key } },
  });
}

export function deleteIdempotencyRecord(id: string) {
  return prisma.idempotencyRecord.deleteMany({ where: { id } });
}

export function createIdempotencyRecord(input: {
  scope: string;
  key: string;
  fingerprint: string;
  expiresAt: Date;
}) {
  return prisma.idempotencyRecord.create({ data: input });
}

export function completeIdempotencyRecord(input: {
  scope: string;
  key: string;
  status: number;
  body: Prisma.InputJsonValue;
}) {
  return prisma.idempotencyRecord.update({
    where: { scope_key: { scope: input.scope, key: input.key } },
    data: {
      status: "completed",
      responseStatus: input.status,
      responseBody: input.body,
    },
  });
}

export function deleteInProgressIdempotencyRecord(scope: string, key: string) {
  return prisma.idempotencyRecord.deleteMany({
    where: { scope, key, status: "in_progress" },
  });
}
