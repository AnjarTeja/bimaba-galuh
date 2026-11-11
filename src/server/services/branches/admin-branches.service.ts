import type { z } from "zod";
import { BranchInputSchema, BranchQuerySchema, BranchUpdateSchema } from "@/contracts/branches";
import type { AuthenticatedSession } from "@/server/auth/session";
import { assertBranchAccess, assertCentralAccess, getBranchEntityFilter } from "@/server/auth/branch-scope";
import { AppError } from "@/server/http/errors";
import {
  createBranch as createBranchRecord,
  deactivateBranch as deactivateBranchRecord,
  findBranch,
  listBranches as listBranchRecords,
  updateBranch as updateBranchRecord,
} from "@/server/repositories/branches/admin-branches.repository";

type BranchQuery = z.infer<typeof BranchQuerySchema>;
type BranchInput = z.infer<typeof BranchInputSchema>;
type BranchUpdate = z.infer<typeof BranchUpdateSchema>;

export function assertBranchManagementAccess(session: AuthenticatedSession) {
  assertCentralAccess(session);
}

export async function listBranches(
  query: BranchQuery,
  page: { skip: number; take: number },
  session: AuthenticatedSession,
) {
  const where = {
    ...getBranchEntityFilter(session),
    ...(query.active ? { active: query.active === "true" } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q } },
            { area: { contains: query.q } },
            { slug: { contains: query.q } },
          ],
        }
      : {}),
  };
  const [branches, total] = await listBranchRecords(where, page.skip, page.take);
  return { branches, total };
}

export async function getBranch(id: string, session: AuthenticatedSession) {
  const branch = await findBranch(id, getBranchEntityFilter(session) ?? {});
  if (!branch) {
    throw new AppError("NOT_FOUND", "Cabang tidak ditemukan.", 404);
  }
  assertBranchAccess(session, branch.id);
  return branch;
}

export async function createBranch(
  input: BranchInput,
  session: AuthenticatedSession,
) {
  assertCentralAccess(session);
  return createBranchRecord({
    slug: input.slug,
    name: input.name,
    area: input.area,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    phone: input.phone,
    hours: input.hours,
    facilities: input.facilities,
    description: input.description,
    active: input.active ?? true,
    verified: false,
  }, session.userId);
}

export async function updateBranch(
  id: string,
  input: BranchUpdate,
  session: AuthenticatedSession,
) {
  assertCentralAccess(session);
  if (Object.keys(input).length === 0) {
    throw new AppError("VALIDATION_ERROR", "Tidak ada field cabang untuk diperbarui.", 400);
  }
  const current = await findBranch(id);
  if (!current) {
    throw new AppError("NOT_FOUND", "Cabang tidak ditemukan.", 404);
  }
  return updateBranchRecord(id, {
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.area !== undefined ? { area: input.area } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.hours !== undefined ? { hours: input.hours } : {}),
    ...(input.facilities !== undefined ? { facilities: input.facilities } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
    ...(input.verified !== undefined ? { verified: input.verified } : {}),
  }, Object.keys(input), session.userId);
}

export async function deactivateBranch(id: string, session: AuthenticatedSession) {
  assertCentralAccess(session);
  const current = await findBranch(id, {});
  if (!current) {
    throw new AppError("NOT_FOUND", "Cabang tidak ditemukan.", 404);
  }
  if (!current.active) {
    return { active: false };
  }
  await deactivateBranchRecord(id, session.userId);
  return { active: false };
}
