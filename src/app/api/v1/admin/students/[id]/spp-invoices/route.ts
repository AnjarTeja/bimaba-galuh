import { CreateSppInvoiceSchema } from "@/contracts/students";
import { withAuth } from "@/server/auth/with-auth";
import { AppError } from "@/server/http/errors";
import { type RouteContext } from "@/server/http/handle-route";
import { parseBody, parseQuery } from "@/server/http/parse";
import { ok, created } from "@/server/http/response";
import {
  createAdminStudentInvoice,
  listAdminStudentInvoices,
} from "@/server/services/students/admin-student.service";
import { z } from "zod";

const roles = ["super_admin", "unit_head", "branch_admin"] as const;

export const GET = withAuth(roles, async (request, context: RouteContext, session) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID murid tidak valid.", 400);
  }
  const query = parseQuery(request, z.object({
    status: z.enum(["unpaid", "partially_paid", "paid", "overdue", "cancelled"]).optional(),
  }));
  return ok(await listAdminStudentInvoices(id, query.status, session));
});

export const POST = withAuth(roles, async (request, context: RouteContext, session) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID murid tidak valid.", 400);
  }
  const input = await parseBody(request, CreateSppInvoiceSchema);
  return created(await createAdminStudentInvoice(id, input, session));
});
