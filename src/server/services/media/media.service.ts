import { createHash } from "node:crypto";
import type { AuthenticatedSession } from "@/server/auth/session";
import { assertBranchAccess } from "@/server/auth/branch-scope";
import { recordActivity } from "@/server/audit/activity-log";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/http/errors";
import {
  createMediaAsset,
  findAdminMediaAsset,
  findPublishedMediaAsset,
} from "@/server/repositories/media/media.repository";
import { inspectUpload } from "@/server/storage/upload-guard";

export async function uploadMedia(file: File, session: AuthenticatedSession) {
  const inspected = await inspectUpload(file);
  const checksum = createHash("sha256").update(inspected.bytes).digest("hex");
  const asset = await prisma.$transaction(async (transaction) => {
    const result = await createMediaAsset(transaction, {
      bytes: inspected.bytes,
      mimeType: inspected.mimeType,
      sizeBytes: BigInt(inspected.bytes.byteLength),
      checksum,
      uploadedById: session.userId,
    });
    await recordActivity(
      {
        actorUserId: session.userId,
        action: "media.uploaded",
        entityType: "media_asset",
        entityId: result.id,
        metadata: {
          mime_type: result.mimeType,
          size_bytes: result.sizeBytes.toString(),
        },
      },
      transaction,
    );
    return result;
  });
  return {
    id: asset.id,
    mime_type: asset.mimeType,
    size_bytes: asset.sizeBytes.toString(),
    uploaded_at: asset.createdAt.toISOString(),
    private_file_url: `/api/v1/admin/media/${asset.id}/file`,
  };
}

export async function getPrivateMedia(
  id: string,
  session: AuthenticatedSession,
) {
  const asset = await findAdminMediaAsset(id);
  if (!asset || !asset.content) {
    throw new AppError("NOT_FOUND", "File tidak ditemukan.", 404);
  }
  const branchIds = [
    asset.paymentProof?.paymentTransaction.registration.branchId,
    asset.staffPhoto?.branchId,
    ...asset.eventMedia.map(({ event }) => event.branchId),
  ].filter((branchId): branchId is string => branchId !== null && branchId !== undefined);
  if (branchIds.length === 0) {
    if (
      !session.user.branchRoles.some(
        ({ branchId, role }) =>
          branchId === null &&
          ["super_admin", "unit_head"].includes(role.code),
      )
    ) {
      throw new AppError(
        "FORBIDDEN",
        "Media belum terhubung dengan data yang dapat diakses.",
        403,
      );
    }
  } else {
    for (const branchId of branchIds) {
      assertBranchAccess(session, branchId);
    }
  }
  return { bytes: asset.content, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes };
}

export async function getPublicMedia(id: string) {
  const asset = await findPublishedMediaAsset(id);
  if (!asset || !asset.content) {
    throw new AppError("NOT_FOUND", "Media tidak ditemukan.", 404);
  }
  return { content: asset.content, mimeType: asset.mimeType };
}
