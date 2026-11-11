import { ZodError, type ZodType } from "zod";
import { AppError } from "./errors";

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Content-Type harus application/json.", 415);
  }

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Body harus berupa JSON yang valid.", 400);
  }

  return parseInput(input, schema);
}

export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  return parseInput(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
    schema,
  );
}

export function parseInput<T>(input: unknown, schema: ZodType<T>): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      const fields: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const field = issue.path.map(String).join(".") || "_";
        (fields[field] ??= []).push(issue.message);
      }
      throw new AppError(
        "VALIDATION_ERROR",
        "Periksa kembali data yang dikirim.",
        400,
        fields,
      );
    }
    throw error;
  }
}
