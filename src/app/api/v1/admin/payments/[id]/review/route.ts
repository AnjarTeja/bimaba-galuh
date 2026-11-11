import { PaymentReviewSchema } from "@/contracts/payments";
import { withAuth } from "@/server/auth/with-auth";
import { AppError } from "@/server/http/errors";
import type { RouteContext } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { ok } from "@/server/http/response";
import { reviewRegistrationPayment } from "@/server/services/payments/payment.service";

export const POST = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, context: RouteContext, session) => {
    const { id } = await context.params;
    if (typeof id !== "string") {
      throw new AppError("VALIDATION_ERROR", "ID pembayaran tidak valid.", 400);
    }
    const input = await parseBody(request, PaymentReviewSchema);
    return ok(await reviewRegistrationPayment(id, input, session));
  },
);
