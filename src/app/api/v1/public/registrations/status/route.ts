import { RegistrationStatusLookupSchema } from "@/contracts/registrations";
import { assertSameOrigin } from "@/server/http/csrf";
import { handleRoute } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { requestAddress } from "@/server/http/pagination";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { ok } from "@/server/http/response";
import { getRegistrationStatus } from "@/server/services/registrations/public-registration.service";

export const POST = handleRoute(async (request) => {
  assertSameOrigin(request);
  const input = await parseBody(request, RegistrationStatusLookupSchema);
  await enforceRateLimit({
    key: `registration-status:${requestAddress(request)}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  return ok(await getRegistrationStatus(input));
});
