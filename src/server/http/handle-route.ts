import { Prisma } from "../../../generated/prisma/client";
import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { fail } from "./response";

export type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<Response>;

export function handleRoute(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof AppError) {
        return fail(error);
      }

      if (error instanceof ZodError) {
        const fields: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const field = issue.path.map(String).join(".") || "_";
          (fields[field] ??= []).push(issue.message);
        }
        return fail(
          new AppError(
            "VALIDATION_ERROR",
            "Periksa kembali data yang dikirim.",
            400,
            fields,
          ),
        );
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return fail(new AppError("NOT_FOUND", "Data tidak ditemukan.", 404));
        }
        if (error.code === "P2002" || error.code === "P2003") {
          return fail(
            new AppError("CONFLICT", "Data bertentangan dengan catatan yang ada.", 409),
          );
        }
      }

      console.error("Unhandled API route error", {
        method: request.method,
        path: request.nextUrl.pathname,
        error,
      });
      return fail(
        new AppError(
          "INTERNAL_ERROR",
          "Terjadi kesalahan pada server.",
          500,
        ),
      );
    }
  };
}
