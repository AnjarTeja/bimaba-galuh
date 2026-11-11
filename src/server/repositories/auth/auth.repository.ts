import { createHash } from "node:crypto";
import { prisma } from "@/server/db/prisma";

export function findLoginUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      active: true,
      passwordHash: true,
      branchRoles: {
        select: {
          branchId: true,
          role: { select: { code: true, name: true } },
          branch: { select: { name: true } },
        },
      },
    },
  });
}

export function updateLastLogin(userId: string, lastLoginAt: Date) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt },
  });
}

export function recordLoginActivity(userId: string) {
  return prisma.activityLog.create({
    data: {
      actorUserId: userId,
      action: "auth.login",
      entityType: "user",
      entityId: userId,
    },
  });
}

export async function consumeAuthRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
) {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = new Date(windowStart + windowMs);
  const id = createHash("sha256")
    .update(`${key}:${windowStart}`)
    .digest("hex");

  const bucket = await prisma.rateLimitBucket.upsert({
    where: { id },
    create: { id, count: 1, expiresAt: resetAt },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  return {
    allowed: bucket.count <= limit,
    resetAt,
  };
}

export function findPasswordResetUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, active: true },
  });
}

export function createPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  return prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

export function findPasswordResetToken(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
}

export function consumePasswordResetToken(input: {
  id: string;
  tokenHash: string;
  userId: string;
  passwordHash: string;
  now: Date;
}) {
  return prisma.$transaction(async (transaction) => {
    const consumed = await transaction.passwordResetToken.updateMany({
      where: {
        id: input.id,
        tokenHash: input.tokenHash,
        usedAt: null,
        expiresAt: { gt: input.now },
      },
      data: { usedAt: input.now },
    });
    if (consumed.count !== 1) {
      return false;
    }

    await transaction.user.update({
      where: { id: input.userId, active: true },
      data: { passwordHash: input.passwordHash },
    });
    await transaction.session.deleteMany({ where: { userId: input.userId } });
    await transaction.passwordResetToken.deleteMany({
      where: { userId: input.userId, id: { not: input.id } },
    });
    return true;
  });
}

export function recordPasswordResetActivity(userId: string) {
  return prisma.activityLog.create({
    data: {
      actorUserId: userId,
      action: "auth.password_reset",
      entityType: "user",
      entityId: userId,
    },
  });
}
