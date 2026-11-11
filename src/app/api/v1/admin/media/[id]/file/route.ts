import { withAuth } from "@/server/auth/with-auth";
import { AppError } from "@/server/http/errors";
import type { RouteContext } from "@/server/http/handle-route";
import { getPrivateMedia } from "@/server/services/media/media.service";
import { NextResponse } from "next/server";

export const GET = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (_request, context: RouteContext, session) => {
    const { id } = await context.params;
    if (typeof id !== "string") {
      throw new AppError("NOT_FOUND", "File tidak ditemukan.", 404);
    }
    const asset = await getPrivateMedia(id, session);
    return new NextResponse(asset.bytes, {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": asset.sizeBytes.toString(),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  },
);
