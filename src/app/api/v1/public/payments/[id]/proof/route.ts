import { assertSameOrigin } from "@/server/http/csrf";
import { AppError } from "@/server/http/errors";
import { handleRoute, type RouteContext } from "@/server/http/handle-route";
import { requestAddress } from "@/server/http/pagination";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { created, ok } from "@/server/http/response";
import { uploadRegistrationPaymentProof } from "@/server/services/payments/payment.service";

export const POST = handleRoute(async (request, context: RouteContext) => {
  assertSameOrigin(request);
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID pembayaran tidak valid.", 400);
  }
  await enforceRateLimit({
    key: `payment-proof:${requestAddress(request)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data;")) {
    throw new AppError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Upload harus menggunakan multipart/form-data.",
      415,
    );
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isFinite(contentLength) || contentLength > 5.5 * 1024 * 1024) {
    throw new AppError("PAYLOAD_TOO_LARGE", "Ukuran request maksimal 5 MB.", 413);
  }
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) {
    throw new AppError("VALIDATION_ERROR", "Header Idempotency-Key wajib diisi.", 400);
  }
  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) {
    throw new AppError("VALIDATION_ERROR", "Field file wajib diisi.", 400);
  }
  const outcome = await uploadRegistrationPaymentProof({
    paymentId: id,
    token,
    idempotencyKey,
    file,
  });
  return outcome.status === 201 ? created(outcome.body) : ok(outcome.body);
});
