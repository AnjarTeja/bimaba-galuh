import { createHash } from "node:crypto";
import { Prisma } from "../../../generated/prisma/client";
import { AppError } from "./errors";
import {
  completeIdempotencyRecord,
  createIdempotencyRecord,
  deleteIdempotencyRecord,
  deleteInProgressIdempotencyRecord,
  findIdempotencyRecord,
} from "@/server/repositories/http/idempotency.repository";

export type IdempotencyReservation =
  | { kind: "reserved" }
  | { kind: "replay"; status: number; body: Prisma.JsonValue }
  | { kind: "in_progress" };

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function fingerprintRequest(input: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

export async function reserveIdempotencyKey({
  scope,
  key,
  fingerprint,
  ttlMs = 24 * 60 * 60 * 1000,
}: {
  scope: string;
  key: string;
  fingerprint: string;
  ttlMs?: number;
}): Promise<IdempotencyReservation> {
  if (!scope || !key || key.length > 191 || !/^[\w.:-]+$/.test(key)) {
    throw new AppError("VALIDATION_ERROR", "Idempotency-Key tidak valid.", 400);
  }

  const existing = await findIdempotencyRecord(scope, key);

  if (existing && existing.expiresAt > new Date()) {
    return classifyExisting(existing, fingerprint);
  }

  if (existing) {
    await deleteIdempotencyRecord(existing.id);
  }

  try {
    await createIdempotencyRecord({
      scope,
      key,
      fingerprint,
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return { kind: "reserved" };
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    const racedRecord = await findIdempotencyRecord(scope, key);
    if (!racedRecord) {
      throw error;
    }
    return classifyExisting(racedRecord, fingerprint);
  }
}

export async function completeIdempotencyKey({
  scope,
  key,
  status,
  body,
}: {
  scope: string;
  key: string;
  status: number;
  body: Prisma.InputJsonValue;
}) {
  await completeIdempotencyRecord({
    scope,
    key,
    status,
    body,
  });
}

export async function abandonIdempotencyKey(scope: string, key: string) {
  await deleteInProgressIdempotencyRecord(scope, key);
}

export async function executeIdempotent<T extends Prisma.InputJsonValue>({
  scope,
  key,
  fingerprint,
  status,
  execute,
}: {
  scope: string;
  key: string;
  fingerprint: string;
  status: number;
  execute: () => Promise<T>;
}): Promise<{ body: T; status: number; replayed: boolean }> {
  const reservation = await reserveIdempotencyKey({ scope, key, fingerprint });
  if (reservation.kind === "in_progress") {
    throw new AppError(
      "CONFLICT",
      "Permintaan dengan key ini masih diproses.",
      409,
      undefined,
      undefined,
      { "Retry-After": "2" },
    );
  }
  if (reservation.kind === "replay") {
    return {
      body: reservation.body as T,
      status: reservation.status,
      replayed: true,
    };
  }

  let body: T;
  try {
    body = await execute();
  } catch (error) {
    await abandonIdempotencyKey(scope, key);
    throw error;
  }

  await completeIdempotencyKey({ scope, key, status, body });
  return { body, status, replayed: false };
}

function classifyExisting(
  record: {
    fingerprint: string;
    status: "in_progress" | "completed";
    responseStatus: number | null;
    responseBody: Prisma.JsonValue | null;
  },
  fingerprint: string,
): IdempotencyReservation {
  if (record.fingerprint !== fingerprint) {
    throw new AppError(
      "CONFLICT",
      "Idempotency-Key sudah digunakan untuk permintaan yang berbeda.",
      409,
    );
  }
  if (record.status === "in_progress") {
    return { kind: "in_progress" };
  }
  if (record.responseStatus === null || record.responseBody === null) {
    throw new Error("Completed idempotency record is missing its response.");
  }

  return {
    kind: "replay",
    status: record.responseStatus,
    body: record.responseBody,
  };
}
