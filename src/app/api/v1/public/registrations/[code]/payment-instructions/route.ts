import { AppError } from "@/server/http/errors";
import { handleRoute, type RouteContext } from "@/server/http/handle-route";
import { ok } from "@/server/http/response";
import { getPaymentInstructions } from "@/server/services/registrations/public-registration.service";

export const GET = handleRoute(async (request, context: RouteContext) => {
  const { code } = await context.params;
  if (typeof code !== "string") {
    throw new AppError("NOT_FOUND", "Instruksi pembayaran tidak ditemukan.", 404);
  }
  return ok(
    await getPaymentInstructions(code, request.headers.get("authorization")),
  );
});
