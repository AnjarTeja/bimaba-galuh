import { createHash } from "node:crypto";
import { prisma } from "@/server/db/prisma";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const sessionUserSelect = {
  id: true,
  email: true,
  fullName: true,
  active: true,
  branchRoles: {
    select: {
      branchId: true,
      role: { select: { code: true } },
    },
  },
} as const;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSessionRecord(
  userId: string,
  token: string,
  expiresAt: Date,
) {
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });
}

export async function resolveSessionRecord(token: string | undefined) {
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      user: { select: sessionUserSelect },
    },
  });

  if (!session) {
    return null;
  }

  if (!session.user.active || session.expiresAt <= new Date()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return session;
}

export async function revokeSessionRecord(token: string | undefined) {
  if (!token) {
    return;
  }
  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}
