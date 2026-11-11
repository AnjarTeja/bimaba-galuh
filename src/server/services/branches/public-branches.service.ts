import type { BranchQuerySchema } from "@/contracts/branches";
import { findPublicBranch, listPublicBranches } from "@/server/repositories/branches/public-branches.repository";
import { AppError } from "@/server/http/errors";
import type { z } from "zod";

type BranchQuery = z.infer<typeof BranchQuerySchema>;

export async function listPublicBranchesForSite(
  query: BranchQuery,
  page: { skip: number; take: number },
) {
  const [data, total] = await listPublicBranches({
    q: query.q,
    skip: page.skip,
    take: page.take,
  });
  return { data, total };
}

export async function getPublicBranch(slug: string) {
  const branch = await findPublicBranch(slug);
  if (!branch) {
    throw new AppError("NOT_FOUND", "Cabang tidak ditemukan.", 404);
  }
  return branch;
}
