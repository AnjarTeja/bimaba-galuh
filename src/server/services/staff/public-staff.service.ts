import type { StaffQuerySchema } from "@/contracts/staff";
import { listPublicStaff } from "@/server/repositories/staff/public-staff.repository";
import type { z } from "zod";

type StaffQuery = z.infer<typeof StaffQuerySchema>;

export async function listPublicStaffForSite(
  query: StaffQuery,
  page: { skip: number; take: number },
) {
  const [staff, total] = await listPublicStaff({
    branch: query.branch,
    role: query.role,
    skip: page.skip,
    take: page.take,
  });
  return {
    data: staff.map(({ photoAsset, ...member }) => ({
      ...member,
      photo_url: photoAsset ? `/api/v1/public/media/${photoAsset.id}` : null,
    })),
    total,
  };
}
