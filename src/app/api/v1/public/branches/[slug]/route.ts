import { AppError } from "@/server/http/errors";
import { handleRoute } from "@/server/http/handle-route";
import { ok } from "@/server/http/response";
import { getPublicBranch } from "@/server/services/branches/public-branches.service";
import type { RouteContext } from "@/server/http/handle-route";

export const GET = handleRoute(async (_request, context: RouteContext) => {
  const { slug } = await context.params;
  if (typeof slug !== "string") {
    throw new AppError("VALIDATION_ERROR", "Slug cabang tidak valid.", 400);
  }
  return ok(await getPublicBranch(slug));
});
