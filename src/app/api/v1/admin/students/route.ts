import { CreateStudentSchema, StudentQuerySchema } from "@/contracts/students";
import { withAuth } from "@/server/auth/with-auth";
import { pagination, pageMeta } from "@/server/http/pagination";
import { parseBody, parseQuery } from "@/server/http/parse";
import { created, ok } from "@/server/http/response";
import {
  createAdminStudent,
  listAdminStudents,
} from "@/server/services/students/admin-student.service";

const roles = ["super_admin", "unit_head", "branch_admin"] as const;

export const GET = withAuth(roles, async (request, _context, session) => {
  const query = parseQuery(request, StudentQuerySchema);
  const page = pagination(query.page, query.page_size);
  const result = await listAdminStudents(query, page, session);
  return ok(result.data, pageMeta(query.page, query.page_size, result.total));
});

export const POST = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, _context, session) => {
    const input = await parseBody(request, CreateStudentSchema);
    return created(await createAdminStudent(input, session));
  },
);
