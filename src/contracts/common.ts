import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export const ApiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "SERVICE_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export interface ApiSuccess<T> {
  data: T;
  meta?: {
    page?: number;
    page_size?: number;
    total?: number;
  };
}

export interface ApiFailure {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}
