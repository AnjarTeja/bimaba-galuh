import { NextResponse } from "next/server";
import type { ApiFailure, ApiSuccess } from "@/contracts/common";
import { AppError } from "./errors";

function jsonResponse<T>(body: T, status = 200, headers?: HeadersInit) {
  const json = JSON.stringify(body, (_key, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  return new NextResponse(json, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

export function ok<T>(data: T, meta?: ApiSuccess<T>["meta"]) {
  const body: ApiSuccess<T> = meta ? { data, meta } : { data };
  return jsonResponse(body);
}

export function created<T>(data: T) {
  return jsonResponse<ApiSuccess<T>>({ data }, 201);
}

export function fail(error: AppError) {
  const body: ApiFailure = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
    },
  };

  const headers = error.retryAfterSeconds
    ? { "Retry-After": String(error.retryAfterSeconds) }
    : undefined;
  return jsonResponse(body, error.status, { ...headers, ...error.headers });
}
