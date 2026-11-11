import { createHash } from "node:crypto";
import { AppError } from "./errors";
import { incrementRateLimitBucket } from "@/server/repositories/http/rate-limit.repository";

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

export async function consumeRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitOptions) {
  if (!key || !Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowMs) || windowMs < 1) {
    throw new RangeError("Rate-limit key, limit, and window must be valid.");
  }

  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = new Date(windowStart + windowMs);
  const id = createHash("sha256")
    .update(`${key}:${windowStart}`)
    .digest("hex");

  const bucket = await incrementRateLimitBucket({ id, expiresAt: resetAt });

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt,
  };
}

export async function enforceRateLimit(options: RateLimitOptions) {
  const result = await consumeRateLimit(options);
  if (!result.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
    );
    throw new AppError(
      "RATE_LIMITED",
      "Terlalu banyak permintaan. Silakan coba kembali nanti.",
      429,
      undefined,
      retryAfterSeconds,
    );
  }
  return result;
}
