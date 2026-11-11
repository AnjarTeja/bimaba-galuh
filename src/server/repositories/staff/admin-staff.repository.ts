import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { recordActivity } from "@/server/audit/activity-log";

export function listStaff(
  where: Prisma.StaffMemberWhereInput,
  skip: number,
  take: number,
) {
  return prisma.$transaction([
    prisma.staffMember.findMany({
      where,
      select: {
        id: true,
        name: true,
        roleTitle: true,
        active: true,
        publicationStatus: true,
        branch: { select: { id: true, name: true } },
        photoAssetId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.staffMember.count({ where }),
  ]);
}

export function findStaff(
  id: string,
  where: Prisma.StaffMemberWhereInput = {},
) {
  return prisma.staffMember.findFirst({ where: { id, ...where } });
}

export function findActiveBranch(id: string) {
  return prisma.branch.findUnique({
    where: { id },
    select: { id: true, active: true },
  });
}

export function findStaffPhoto(id: string) {
  return prisma.mediaAsset.findUnique({
    where: { id },
    select: {
      id: true,
      uploadedById: true,
      consents: {
        where: {
          consentType: "media_publication",
          granted: true,
          revokedAt: null,
        },
        select: { id: true },
        take: 1,
      },
    },
  });
}

export function createStaff(
  data: Prisma.StaffMemberUncheckedCreateInput,
  actorUserId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const member = await transaction.staffMember.create({
      data,
      select: { id: true, branchId: true, name: true, publicationStatus: true },
    });
    await recordActivity({
      actorUserId,
      branchId: member.branchId ?? undefined,
      action: "staff.created",
      entityType: "staff_member",
      entityId: member.id,
      metadata: { name: member.name },
    }, transaction);
    return member;
  });
}

export function updateStaff(
  id: string,
  data: Prisma.StaffMemberUncheckedUpdateInput,
  changedFields: string[],
  actorUserId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const member = await transaction.staffMember.update({
      where: { id },
      data,
      select: { id: true, branchId: true, publicationStatus: true, updatedAt: true },
    });
    await recordActivity({
      actorUserId,
      branchId: member.branchId ?? undefined,
      action: "staff.updated",
      entityType: "staff_member",
      entityId: id,
      metadata: { changed_fields: changedFields },
    }, transaction);
    return member;
  });
}

export function archiveStaff(id: string, branchId: string | null, actorUserId: string) {
  return prisma.$transaction(async (transaction) => {
    await transaction.staffMember.update({
      where: { id },
      data: { active: false, publicationStatus: "archived" },
    });
    await recordActivity({
      actorUserId,
      branchId: branchId ?? undefined,
      action: "staff.archived",
      entityType: "staff_member",
      entityId: id,
    }, transaction);
  });
}
