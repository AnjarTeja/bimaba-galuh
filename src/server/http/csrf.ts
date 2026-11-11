import type { NextRequest } from "next/server";
import { AppError } from "./errors";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function assertSameOrigin(request: NextRequest) {
  if (!unsafeMethods.has(request.method)) {
    return;
  }

  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    throw new AppError("FORBIDDEN", "Origin permintaan tidak diizinkan.", 403);
  }
}
