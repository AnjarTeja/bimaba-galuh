import { handleRoute } from "@/server/http/handle-route";
import { ok } from "@/server/http/response";
import { getPublicSettings } from "@/server/services/settings/public-settings.service";

export const GET = handleRoute(async () => {
  return ok(await getPublicSettings());
});
