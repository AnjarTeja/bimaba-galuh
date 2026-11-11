import { ResetPasswordSchema } from "@/contracts/auth";
import { assertSameOrigin } from "@/server/http/csrf";
import { handleRoute } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { ok } from "@/server/http/response";
import { resetPassword } from "@/server/services/auth/auth.service";

export const POST = handleRoute(async (request) => {
  assertSameOrigin(request);
  const input = await parseBody(request, ResetPasswordSchema);
  await resetPassword(input);
  return ok({ password_reset: true });
});
