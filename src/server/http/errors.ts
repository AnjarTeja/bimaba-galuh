import type { ApiErrorCode } from "@/contracts/common";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string[]>;
  readonly retryAfterSeconds?: number;
  readonly headers?: Record<string, string>;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    fields?: Record<string, string[]>,
    retryAfterSeconds?: number,
    headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.fields = fields;
    this.retryAfterSeconds = retryAfterSeconds;
    this.headers = headers;
  }
}
