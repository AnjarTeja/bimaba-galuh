import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { recordActivity } from "@/server/audit/activity-log";

export function listBranches(
  where: Prisma.BranchWhereInput,
  skip: number,
  take: number,
) {
  return prisma.$transaction([
    prisma.branch.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        area: true,
        address: true,
        latitude: true,
        longitude: true,
        phone: true,
        hours: true,
        facilities: true,
        description: true,
        active: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.branch.count({ where }),
  ]);
}

export function findBranch(id: string, where: Prisma.BranchWhereInput = {}) {
  return prisma.branch.findFirst({ where: { id, ...where } });
}

export function createBranch(
  data: Prisma.BranchCreateInput,
  actorUserId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const branch = await transaction.branch.create({
      data,
      select: { id: true, slug: true, name: true },
    });
    await recordActivity({
      actorUserId,
      branchId: branch.id,
      action: "branch.created",
      entityType: "branch",
      entityId: branch.id,
      metadata: { slug: branch.slug },
    }, transaction);
    return branch;
  });
}

export function updateBranch(
  id: string,
  data: Prisma.BranchUpdateInput,
  changedFields: string[],
  actorUserId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const branch = await transaction.branch.update({
      where: { id },
      data,
      select: { id: true, updatedAt: true },
    });
    await recordActivity({
      actorUserId,
      branchId: id,
      action: "branch.updated",
      entityType: "branch",
      entityId: id,
      metadata: { changed_fields: changedFields },
    }, transaction);
    return branch;
  });
}

export function deactivateBranch(id: string, actorUserId: string) {
  return prisma.$transaction(async (transaction) => {
    await transaction.branch.update({ where: { id }, data: { active: false } });
    await recordActivity({
      actorUserId,
      branchId: id,
      action: "branch.deactivated",
      entityType: "branch",
      entityId: id,
    }, transaction);
  });
}
