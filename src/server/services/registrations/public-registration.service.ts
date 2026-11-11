import { randomBytes } from "node:crypto";
import { CreateRegistrationSchema } from "@/contracts/registrations";
import type { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/http/errors";
import {
  abandonIdempotencyKey,
  fingerprintRequest,
  reserveIdempotencyKey,
} from "@/server/http/idempotency";
import { createRegistrationAccessToken } from "@/server/security/registration-token";
import { getRegistrationPaymentSettings } from "@/server/services/settings/public-settings.service";
import {
  completeRegistrationIdempotency,
  createPublicRegistration,
  findDuplicateRegistration,
  findPublicBranch,
  findPublicPaymentInstructions,
  findPublicRegistrationStatus,
  upsertRegistrationGuardian,
} from "@/server/repositories/registrations/public-registration.repository";
import { verifyRegistrationAccessToken } from "@/server/security/registration-token";

type CreateRegistrationInput = z.infer<typeof CreateRegistrationSchema>;

function registrationCode() {
  const date = new Date();
  const day = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  return `BG-${day}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function calculateAge(birthDate: Date, now: Date) {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < birthDate.getUTCDate())
  ) {
    age--;
  }
  return age;
}

export async function createRegistration(
  input: CreateRegistrationInput,
  idempotency: { scope: string; key: string },
) {
  const paymentSettings = await getRegistrationPaymentSettings();
  const now = new Date();
  const age = calculateAge(input.birth_date, now);
  if (input.birth_date > now || age < 2 || age > 7) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Usia calon murid harus 2 sampai 7 tahun dan tanggal lahir tidak boleh di masa depan.",
      400,
      { birth_date: ["Usia yang didukung adalah 2 sampai 7 tahun."] },
    );
  }

  const registration = await prisma.$transaction(async (transaction) => {
    const branch = await findPublicBranch(transaction, input.branch_id);
    if (!branch) {
      throw new AppError("VALIDATION_ERROR", "Cabang tidak tersedia.", 400);
    }

    const guardian = await upsertRegistrationGuardian(transaction, {
      name: input.guardian.name,
      phoneE164: input.guardian.phone_e164,
      email: input.guardian.email,
    });
    const duplicates = await findDuplicateRegistration(transaction, {
      guardianId: guardian.id,
      branchId: input.branch_id,
      childName: input.child_name,
    });
    if (duplicates.length > 0) {
      throw new AppError(
        "CONFLICT",
        "Pendaftaran serupa masih tercatat. Hubungi cabang jika perlu bantuan.",
        409,
      );
    }

    const created = await createPublicRegistration(transaction, {
      code: registrationCode(),
      childName: input.child_name,
      birthDate: input.birth_date,
      religion: input.religion,
      gender: input.gender,
      address: input.address,
      guardianId: guardian.id,
      branchId: input.branch_id,
      consultationAt: input.consultation_at,
      notes: input.notes,
      consents: input.consents,
      amountIdr: paymentSettings.amountIdr,
      dueDays: paymentSettings.instructions.registration_due_days ?? 7,
    });
    await completeRegistrationIdempotency(transaction, {
      ...idempotency,
      registration: created,
    });
    return created;
  });

  return {
    registration_code: registration.registrationCode,
    status: registration.status,
    submitted_at: registration.submittedAt.toISOString(),
    next_action: "payment_instructions",
    access_token: createRegistrationAccessToken(
      registration.id,
      registration.registrationCode,
    ),
  };
}

export async function submitRegistration(
  input: CreateRegistrationInput,
  idempotency: { scope: string; key: string },
) {
  const reservation = await reserveIdempotencyKey({
    ...idempotency,
    fingerprint: fingerprintRequest(input),
  });
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
      status: reservation.status,
      body: getRegistrationReplay(reservation.body as {
        registration_id: string;
        registration_code: string;
        status: string;
        submitted_at: string;
        next_action: string;
      }),
    };
  }
  try {
    return {
      status: 201,
      body: await createRegistration(input, idempotency),
    };
  } catch (error) {
    await abandonIdempotencyKey(idempotency.scope, idempotency.key);
    throw error;
  }
}

export function getRegistrationReplay(body: {
  registration_id: string;
  registration_code: string;
  status: string;
  submitted_at: string;
  next_action: string;
}) {
  return {
    registration_code: body.registration_code,
    status: body.status,
    submitted_at: body.submitted_at,
    next_action: body.next_action,
    access_token: createRegistrationAccessToken(
      body.registration_id,
      body.registration_code,
    ),
  };
}

export async function getRegistrationStatus(input: {
  registration_code: string;
  verification_token: string;
}) {
  const claims = verifyRegistrationAccessToken(input.verification_token);
  if (!claims || claims.registration_code !== input.registration_code) {
    throw new AppError("NOT_FOUND", "Data pendaftaran tidak ditemukan.", 404);
  }
  const registration = await findPublicRegistrationStatus(
    claims.registration_id,
    claims.registration_code,
  );
  if (!registration) {
    throw new AppError("NOT_FOUND", "Data pendaftaran tidak ditemukan.", 404);
  }
  return {
    registration_code: registration.registrationCode,
    status: registration.status,
    submitted_at: registration.submittedAt.toISOString(),
    updated_at: registration.updatedAt.toISOString(),
    latest_update: registration.statusHistory[0]
      ? {
          status: registration.statusHistory[0].toStatus,
          changed_at: registration.statusHistory[0].changedAt.toISOString(),
        }
      : null,
    payment: registration.transactions[0]
      ? {
          status: registration.transactions[0].status,
          due_at: registration.transactions[0].dueAt?.toISOString() ?? null,
        }
      : null,
  };
}

export async function getPaymentInstructions(
  code: string,
  authorization: string | null,
) {
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const claims = verifyRegistrationAccessToken(token);
  if (!claims || claims.registration_code !== code) {
    throw new AppError("NOT_FOUND", "Instruksi pembayaran tidak ditemukan.", 404);
  }
  const registration = await findPublicPaymentInstructions(
    claims.registration_id,
    code,
  );
  const transaction = registration?.transactions[0];
  if (!registration || !transaction) {
    throw new AppError("NOT_FOUND", "Instruksi pembayaran tidak ditemukan.", 404);
  }
  if (["confirmed", "rejected", "withdrawn", "expired"].includes(registration.status)) {
    throw new AppError("CONFLICT", "Pendaftaran ini tidak menerima pembayaran.", 409);
  }
  const { instructions } = await getRegistrationPaymentSettings();
  return {
    payment_id: transaction.id,
    registration_status: registration.status,
    payment_status: transaction.status,
    amount_idr: transaction.amountIdr.toString(),
    currency: transaction.currency,
    due_at: transaction.dueAt?.toISOString() ?? null,
    instructions,
  };
}
