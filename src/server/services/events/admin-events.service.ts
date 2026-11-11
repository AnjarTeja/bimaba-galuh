import type { z } from "zod";
import {
  EventInputSchema,
  EventQuerySchema,
  PublicationReviewSchema,
} from "@/contracts/events";
import type { AuthenticatedSession } from "@/server/auth/session";
import { assertBranchAccess, getBranchFilter } from "@/server/auth/branch-scope";
import { AppError } from "@/server/http/errors";
import {
  archiveEvent as archiveEventRecord,
  createEvent as createEventRecord,
  findActiveBranch,
  findEvent,
  findEventForReview,
  findUsableEventAssets,
  listEvents as listEventRecords,
  reviewEvent as reviewEventRecord,
  updateEvent as updateEventRecord,
} from "@/server/repositories/events/admin-events.repository";

type EventQuery = z.infer<typeof EventQuerySchema> & {
  publication_status?: "draft" | "pending_review" | "published" | "rejected" | "archived";
};
type EventInput = z.infer<typeof EventInputSchema>;
type EventUpdate = Partial<EventInput>;
type PublicationReview = z.infer<typeof PublicationReviewSchema>;

async function validateBranchAndAssets(
  branchId: string,
  mediaAssetIds: string[] | undefined,
  session: AuthenticatedSession,
  requireActiveBranch = true,
) {
  if (requireActiveBranch) {
    const branch = await findActiveBranch(branchId);
    if (!branch) {
      throw new AppError("VALIDATION_ERROR", "Cabang tidak tersedia.", 400);
    }
    assertBranchAccess(session, branch.id);
  } else {
    assertBranchAccess(session, branchId);
  }
  if (mediaAssetIds?.length) {
    const assets = await findUsableEventAssets(mediaAssetIds, session.userId);
    if (assets.length !== new Set(mediaAssetIds).size) {
      throw new AppError("VALIDATION_ERROR", "Satu atau lebih media tidak dapat digunakan.", 400);
    }
  }
}

export async function listEvents(
  query: EventQuery,
  page: { skip: number; take: number },
  session: AuthenticatedSession,
) {
  const where = {
    ...getBranchFilter(session, query.branch),
    ...(query.category ? { category: { contains: query.category } } : {}),
    ...(query.publication_status ? { publicationStatus: query.publication_status } : {}),
  };
  const [events, total] = await listEventRecords(where, page.skip, page.take);
  return { events, total };
}

export async function createEvent(input: EventInput, session: AuthenticatedSession) {
  await validateBranchAndAssets(input.branch_id, input.media_asset_ids, session);
  return createEventRecord({
    branchId: input.branch_id,
    title: input.title,
    category: input.category,
    description: input.description,
    eventDate: input.event_date ? new Date(input.event_date) : null,
    createdById: session.userId,
    publicationStatus: "draft",
    media: {
      create: input.media_asset_ids.map((mediaAssetId, sortOrder) => ({
        mediaAssetId,
        sortOrder,
      })),
    },
  }, input.branch_id, session.userId);
}

export async function updateEvent(
  id: string,
  input: EventUpdate,
  session: AuthenticatedSession,
) {
  if (!Object.keys(input).length) {
    throw new AppError("VALIDATION_ERROR", "Tidak ada field kegiatan untuk diperbarui.", 400);
  }
  const current = await findEvent(id, getBranchFilter(session));
  if (!current) {
    throw new AppError("NOT_FOUND", "Kegiatan tidak ditemukan.", 404);
  }
  assertBranchAccess(session, current.branchId);
  const branchId = input.branch_id ?? current.branchId;
  assertBranchAccess(session, branchId);
  if (input.branch_id || input.media_asset_ids) {
    await validateBranchAndAssets(
      branchId,
      input.media_asset_ids,
      session,
      input.branch_id !== undefined,
    );
  }
  return updateEventRecord(id, {
    ...(input.branch_id !== undefined ? { branchId: input.branch_id } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.event_date !== undefined
      ? { eventDate: input.event_date ? new Date(input.event_date) : null }
      : {}),
    ...(input.media_asset_ids
      ? {
          media: {
            deleteMany: {},
            create: input.media_asset_ids.map((mediaAssetId, sortOrder) => ({
              mediaAssetId,
              sortOrder,
            })),
          },
          publicationStatus: "draft",
        }
      : {}),
  }, branchId, Object.keys(input), session.userId);
}

export async function archiveEvent(id: string, session: AuthenticatedSession) {
  const event = await findEvent(id, getBranchFilter(session));
  if (!event) {
    throw new AppError("NOT_FOUND", "Kegiatan tidak ditemukan.", 404);
  }
  assertBranchAccess(session, event.branchId);
  await archiveEventRecord(id, event.branchId, session.userId);
  return { archived: true };
}

export async function reviewEvent(
  id: string,
  input: PublicationReview,
  session: AuthenticatedSession,
) {
  const event = await findEventForReview(id, getBranchFilter(session) ?? {});
  if (!event) {
    throw new AppError("NOT_FOUND", "Kegiatan tidak ditemukan.", 404);
  }
  assertBranchAccess(session, event.branchId);
  if (
    input.decision === "approve" &&
    event.media.some(({ mediaAsset }) => mediaAsset.consents.length === 0)
  ) {
    throw new AppError(
      "CONFLICT",
      "Semua media kegiatan harus memiliki persetujuan publikasi yang masih berlaku.",
      409,
    );
  }
  await reviewEventRecord(id, event.branchId, input.decision, input.reason, session.userId);
  return {
    id,
    publication_status: input.decision === "approve" ? "published" : "rejected",
  };
}
