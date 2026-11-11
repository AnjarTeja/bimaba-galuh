import { CreateRegistrationSchema } from "@/contracts/registrations";
import { assertSameOrigin } from "@/server/http/csrf";
import { AppError } from "@/server/http/errors";
import { handleRoute } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { requestAddress } from "@/server/http/pagination";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { created, ok } from "@/server/http/response";
import { assertRegistrationTokenConfigured } from "@/server/security/registration-token";
import { submitRegistration } from "@/server/services/registrations/public-registration.service";

export const POST = handleRoute(async (request) => {
  assertSameOrigin(request);
  assertRegistrationTokenConfigured();
  const input = await parseBody(request, CreateRegistrationSchema);
  await enforceRateLimit({
    key: `registration:${requestAddress(request)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) {
    throw new AppError("VALIDATION_ERROR", "Header Idempotency-Key wajib diisi.", 400);
  }
  const scope = `public-registration:${requestAddress(request)}`;
  const result = await submitRegistration(input, {
    scope,
    key: idempotencyKey,
  });
  return result.status === 201 ? created(result.body) : ok(result.body);
});
