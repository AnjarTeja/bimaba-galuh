import { ForgotPasswordSchema } from "@/contracts/auth";
import { assertSameOrigin } from "@/server/http/csrf";
import { handleRoute } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { requestAddress } from "@/server/http/pagination";
import { ok } from "@/server/http/response";
import { forgotPassword } from "@/server/services/auth/auth.service";

export const POST = handleRoute(async (request) => {
  assertSameOrigin(request);
  const input = await parseBody(request, ForgotPasswordSchema);
  await forgotPassword(input, requestAddress(request), request.nextUrl.origin);

  return ok({
    message: "Jika email terdaftar, instruksi pemulihan akan dikirim.",
  });
});
