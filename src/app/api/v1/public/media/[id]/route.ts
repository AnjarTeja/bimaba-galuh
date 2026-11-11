import { AppError } from "@/server/http/errors";
import { handleRoute, type RouteContext } from "@/server/http/handle-route";
import { getPublicMedia } from "@/server/services/media/media.service";
import { NextResponse } from "next/server";

export const GET = handleRoute(async (_request, context: RouteContext) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("NOT_FOUND", "Media tidak ditemukan.", 404);
  }
  const asset = await getPublicMedia(id);
  return new NextResponse(asset.content, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.content.byteLength),
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
