import { CreateMessageSchema } from "@/contracts/messages";
import { assertSameOrigin } from "@/server/http/csrf";
import { handleRoute } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { requestAddress } from "@/server/http/pagination";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { created } from "@/server/http/response";
import { createPublicMessageFromInput } from "@/server/services/messages/public-messages.service";

export const POST = handleRoute(async (request) => {
  assertSameOrigin(request);
  const input = await parseBody(request, CreateMessageSchema);
  await enforceRateLimit({
    key: `public-message:${requestAddress(request)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  return created(await createPublicMessageFromInput(input));
});
