import { z } from "zod";
import { StaffInputSchema, StaffQuerySchema } from "@/contracts/staff";
import { withAuth } from "@/server/auth/with-auth";
import { createStaff, listStaff } from "@/server/services/staff/admin-staff.service";
import { pagination, pageMeta } from "@/server/http/pagination";
import { parseBody, parseQuery } from "@/server/http/parse";
import { created, ok } from "@/server/http/response";

const roles = ["super_admin", "unit_head", "branch_admin"] as const;
const AdminStaffQuery = StaffQuerySchema.extend({
  active: z.enum(["true", "false"]).optional(),
  publication_status: z.enum(["draft", "pending_review", "published", "rejected", "archived"]).optional(),
});

export const GET = withAuth(roles, async (request, _context, session) => {
  const query = parseQuery(request, AdminStaffQuery);
  const page = pagination(query.page, query.page_size);
  const { staff, total } = await listStaff(query, page, session);
  return ok(
    staff.map(({ roleTitle, publicationStatus, photoAssetId, createdAt, updatedAt, ...member }) => ({
      ...member,
      role_title: roleTitle,
      publication_status: publicationStatus,
      photo_url: photoAssetId ? `/api/v1/public/media/${photoAssetId}` : null,
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
    })),
    pageMeta(query.page, query.page_size, total),
  );
});

export const POST = withAuth(roles, async (request, _context, session) => {
  const input = await parseBody(request, StaffInputSchema);
  const member = await createStaff(input, session);
  return created({
    id: member.id,
    name: member.name,
    publication_status: member.publicationStatus,
  });
});
