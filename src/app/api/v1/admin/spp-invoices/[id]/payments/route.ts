import { RecordSppPaymentSchema } from "@/contracts/students";
import { withAuth } from "@/server/auth/with-auth";
import { AppError } from "@/server/http/errors";
import { type RouteContext } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { created, ok } from "@/server/http/response";
import { recordAdminSppPayment } from "@/server/services/students/admin-student.service";

export const POST = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, context: RouteContext, session) => {
    const { id } = await context.params;
    if (typeof id !== "string") {
      throw new AppError("VALIDATION_ERROR", "ID tagihan tidak valid.", 400);
    }
    const input = await parseBody(request, RecordSppPaymentSchema);
    const key = request.headers.get("idempotency-key");
    if (!key) {
      throw new AppError("VALIDATION_ERROR", "Header Idempotency-Key wajib diisi.", 400);
    }
    const outcome = await recordAdminSppPayment(id, input, key, session);
    return outcome.status === 201 ? created(outcome.body) : ok(outcome.body);
  },
);
