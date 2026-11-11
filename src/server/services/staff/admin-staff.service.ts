import type { z } from "zod";
import { StaffInputSchema, StaffQuerySchema } from "@/contracts/staff";
import type { AuthenticatedSession } from "@/server/auth/session";
import { assertBranchAccess, getBranchEntityFilter, getBranchFilter } from "@/server/auth/branch-scope";
import { AppError } from "@/server/http/errors";
import {
  archiveStaff as archiveStaffRecord,
  createStaff as createStaffRecord,
  findActiveBranch,
  findStaff,
  findStaffPhoto,
  listStaff as listStaffRecords,
  updateStaff as updateStaffRecord,
} from "@/server/repositories/staff/admin-staff.repository";

type StaffQuery = z.infer<typeof StaffQuerySchema> & {
  active?: "true" | "false";
  publication_status?: "draft" | "pending_review" | "published" | "rejected" | "archived";
};
type StaffInput = z.infer<typeof StaffInputSchema>;
type StaffUpdate = Partial<StaffInput>;

const isCentralManager = (session: AuthenticatedSession) =>
  session.user.branchRoles.some(
    ({ branchId, role }) =>
      branchId === null && ["super_admin", "unit_head"].includes(role.code),
  );

async function validatePhoto(
  photoAssetId: string | null | undefined,
  publicationStatus: string | undefined,
  session: AuthenticatedSession,
  previousPhotoAssetId?: string | null,
) {
  if (!photoAssetId) return;
  const asset = await findStaffPhoto(photoAssetId);
  if (
    !asset ||
    (photoAssetId !== previousPhotoAssetId && asset.uploadedById !== session.userId)
  ) {
    throw new AppError("NOT_FOUND", "Media tidak ditemukan.", 404);
  }
  if (publicationStatus === "published" && asset.consents.length === 0) {
    throw new AppError("CONFLICT", "Foto staf harus memiliki persetujuan publikasi.", 409);
  }
}

export async function listStaff(
  query: StaffQuery,
  page: { skip: number; take: number },
  session: AuthenticatedSession,
) {
  const scopeFilter = getBranchEntityFilter(session, query.branch);
  const where = {
    ...(scopeFilter ? { branchId: scopeFilter.id } : {}),
    ...(query.active ? { active: query.active === "true" } : {}),
    ...(query.role ? { roleTitle: { contains: query.role } } : {}),
    ...(query.publication_status ? { publicationStatus: query.publication_status } : {}),
  };
  const [staff, total] = await listStaffRecords(where, page.skip, page.take);
  return { staff, total };
}

export async function createStaff(input: StaffInput, session: AuthenticatedSession) {
  if (input.branch_id) {
    const branch = await findActiveBranch(input.branch_id);
    if (!branch?.active) {
      throw new AppError("VALIDATION_ERROR", "Cabang tidak tersedia.", 400);
    }
    getBranchEntityFilter(session, input.branch_id);
  } else if (!isCentralManager(session)) {
    throw new AppError("FORBIDDEN", "Hanya pengelola pusat yang dapat menambah staf pusat.", 403);
  }
  await validatePhoto(input.photo_asset_id, input.publication_status, session);
  return createStaffRecord({
    branchId: input.branch_id,
    name: input.name,
    roleTitle: input.role_title,
    active: input.active ?? true,
    publicationStatus: input.publication_status ?? "draft",
    photoAssetId: input.photo_asset_id,
  }, session.userId);
}

export async function updateStaff(
  id: string,
  input: StaffUpdate,
  session: AuthenticatedSession,
) {
  if (Object.keys(input).length === 0) {
    throw new AppError("VALIDATION_ERROR", "Tidak ada field staf untuk diperbarui.", 400);
  }
  const current = await findStaff(id, getBranchFilter(session));
  if (!current) {
    throw new AppError("NOT_FOUND", "Staf tidak ditemukan.", 404);
  }
  if (current.branchId) {
    assertBranchAccess(session, current.branchId);
  } else if (!isCentralManager(session)) {
    throw new AppError("FORBIDDEN", "Akses ke staf pusat tidak diizinkan.", 403);
  }
  const nextBranchId = input.branch_id === undefined ? current.branchId : input.branch_id;
  if (nextBranchId) {
    getBranchFilter(session, nextBranchId);
  } else if (!isCentralManager(session)) {
    throw new AppError("FORBIDDEN", "Hanya pengelola pusat yang dapat mengelola staf pusat.", 403);
  }
  const nextPhotoAssetId =
    input.photo_asset_id === undefined ? current.photoAssetId : input.photo_asset_id;
  await validatePhoto(
    nextPhotoAssetId,
    input.publication_status ?? current.publicationStatus,
    session,
    current.photoAssetId,
  );
  return updateStaffRecord(id, {
    ...(input.branch_id !== undefined ? { branchId: input.branch_id } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.role_title !== undefined ? { roleTitle: input.role_title } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
    ...(input.publication_status !== undefined ? { publicationStatus: input.publication_status } : {}),
    ...(input.photo_asset_id !== undefined ? { photoAssetId: input.photo_asset_id } : {}),
  }, Object.keys(input), session.userId);
}

export async function archiveStaff(id: string, session: AuthenticatedSession) {
  const current = await findStaff(id, getBranchFilter(session));
  if (!current) {
    throw new AppError("NOT_FOUND", "Staf tidak ditemukan.", 404);
  }
  if (current.branchId) {
    assertBranchAccess(session, current.branchId);
  }
  await archiveStaffRecord(id, current.branchId, session.userId);
  return { archived: true };
}
