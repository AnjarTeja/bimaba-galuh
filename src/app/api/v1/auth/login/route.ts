import { LoginSchema } from "@/contracts/auth";
import { assertSameOrigin } from "@/server/http/csrf";
import { handleRoute } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { requestAddress } from "@/server/http/pagination";
import { created } from "@/server/http/response";
import { setSessionCookie } from "@/server/auth/session";
import { login } from "@/server/services/auth/auth.service";

export const POST = handleRoute(async (request) => {
  assertSameOrigin(request);
  const input = await parseBody(request, LoginSchema);
  const result = await login(input, requestAddress(request));

  return setSessionCookie(
    created(result.data),
    result.token,
  );
});
