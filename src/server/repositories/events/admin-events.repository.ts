import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { recordActivity } from "@/server/audit/activity-log";

export function listEvents(
  where: Prisma.EventWhereInput,
  skip: number,
  take: number,
) {
  return prisma.$transaction([
    prisma.event.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        eventDate: true,
        publicationStatus: true,
        branch: { select: { id: true, name: true } },
        media: {
          select: { mediaAssetId: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.event.count({ where }),
  ]);
}

export function findEvent(
  id: string,
  where: Prisma.EventWhereInput = {},
) {
  return prisma.event.findFirst({
    where: { id, ...where },
    select: { id: true, branchId: true },
  });
}

export function findEventForReview(
  id: string,
  where: Prisma.EventWhereInput,
) {
  return prisma.event.findFirst({
    where: { id, ...where },
    select: {
      id: true,
      branchId: true,
      media: {
        select: {
          mediaAsset: {
            select: {
              consents: {
                where: {
                  consentType: "media_publication",
                  granted: true,
                  revokedAt: null,
                },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
}

export function findActiveBranch(id: string) {
  return prisma.branch.findFirst({
    where: { id, active: true },
    select: { id: true },
  });
}

export function findUsableEventAssets(ids: string[], userId: string) {
  return prisma.mediaAsset.findMany({
    where: {
      id: { in: ids },
      uploadedById: userId,
      paymentProof: null,
    },
    select: { id: true },
  });
}

export function createEvent(
  data: Prisma.EventUncheckedCreateInput,
  branchId: string,
  actorUserId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const event = await transaction.event.create({
      data,
      select: { id: true, publicationStatus: true, createdAt: true },
    });
    await recordActivity({
      actorUserId,
      branchId,
      action: "event.created",
      entityType: "event",
      entityId: event.id,
    }, transaction);
    return event;
  });
}

export function updateEvent(
  id: string,
  data: Prisma.EventUncheckedUpdateInput,
  branchId: string,
  changedFields: string[],
  actorUserId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const event = await transaction.event.update({
      where: { id },
      data,
      select: { id: true, publicationStatus: true, updatedAt: true },
    });
    await recordActivity({
      actorUserId,
      branchId,
      action: "event.updated",
      entityType: "event",
      entityId: id,
      metadata: { changed_fields: changedFields },
    }, transaction);
    return event;
  });
}

export function archiveEvent(id: string, branchId: string, actorUserId: string) {
  return prisma.$transaction(async (transaction) => {
    await transaction.event.update({
      where: { id },
      data: { publicationStatus: "archived" },
    });
    await recordActivity({
      actorUserId,
      branchId,
      action: "event.archived",
      entityType: "event",
      entityId: id,
    }, transaction);
  });
}

export function reviewEvent(
  id: string,
  branchId: string,
  decision: "approve" | "reject",
  reason: string | undefined,
  actorUserId: string,
) {
  return prisma.$transaction(async (transaction) => {
    await transaction.event.update({
      where: { id },
      data: { publicationStatus: decision === "approve" ? "published" : "rejected" },
    });
    await recordActivity({
      actorUserId,
      branchId,
      action: `event.publication_${decision === "approve" ? "approved" : "rejected"}`,
      entityType: "event",
      entityId: id,
      metadata: { reason },
    }, transaction);
  });
}
