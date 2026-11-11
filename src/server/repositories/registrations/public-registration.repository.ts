import type {
  ConsentType,
  Prisma,
} from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";

type RegistrationTransaction = Prisma.TransactionClient;

export function findPublicBranch(
  client: RegistrationTransaction,
  branchId: string,
) {
  return client.branch.findFirst({
    where: { id: branchId, active: true, verified: true },
    select: { id: true },
  });
}

export function upsertRegistrationGuardian(
  client: RegistrationTransaction,
  guardian: { name: string; phoneE164: string; email?: string },
) {
  return client.guardian.upsert({
    where: { phoneE164: guardian.phoneE164 },
    create: guardian,
    update: {
      name: guardian.name,
      ...(guardian.email ? { email: guardian.email } : {}),
    },
    select: { id: true },
  });
}

export async function findDuplicateRegistration(
  client: RegistrationTransaction,
  input: { guardianId: string; branchId: string; childName: string },
) {
  await client.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM guardians WHERE id = ${input.guardianId} FOR UPDATE
  `;
  return client.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM registrations
    WHERE guardian_id = ${input.guardianId}
      AND branch_id = ${input.branchId}
      AND child_name = ${input.childName}
      AND status NOT IN ('withdrawn', 'expired')
      AND deleted_at IS NULL
    LIMIT 1
    FOR UPDATE
  `;
}

export function createPublicRegistration(
  client: RegistrationTransaction,
  input: {
    code: string;
    childName: string;
    birthDate: Date;
    religion?: string;
    gender?: string;
    address: string;
    guardianId: string;
    branchId: string;
    consultationAt?: string;
    notes?: string;
    consents: Array<{ consent_type: ConsentType; policy_version: string }>;
    amountIdr: bigint;
    dueDays: number;
  },
) {
  return client.registration.create({
    data: {
      registrationCode: input.code,
      childName: input.childName,
      birthDate: input.birthDate,
      religion: input.religion,
      gender: input.gender,
      address: input.address,
      guardianId: input.guardianId,
      branchId: input.branchId,
      consultationAt: input.consultationAt
        ? new Date(input.consultationAt)
        : null,
      notes: input.notes,
      status: "awaiting_payment",
      consents: {
        create: input.consents.map((consent) => ({
          consentType: consent.consent_type,
          policyVersion: consent.policy_version,
          granted: true,
          grantedAt: new Date(),
        })),
      },
      statusHistory: {
        create: {
          toStatus: "awaiting_payment",
          reason: "Pendaftaran diterima dari formulir publik.",
        },
      },
      transactions: {
        create: {
          amountIdr: input.amountIdr,
          dueAt: new Date(Date.now() + input.dueDays * 24 * 60 * 60 * 1000),
        },
      },
    },
    select: { id: true, registrationCode: true, status: true, submittedAt: true },
  });
}

export function completeRegistrationIdempotency(
  client: RegistrationTransaction,
  input: {
    scope: string;
    key: string;
    registration: {
      id: string;
      registrationCode: string;
      status: string;
      submittedAt: Date;
    };
  },
) {
  return client.idempotencyRecord.update({
    where: { scope_key: { scope: input.scope, key: input.key } },
    data: {
      status: "completed",
      responseStatus: 201,
      responseBody: {
        registration_id: input.registration.id,
        registration_code: input.registration.registrationCode,
        status: input.registration.status,
        submitted_at: input.registration.submittedAt.toISOString(),
        next_action: "payment_instructions",
      },
    },
  });
}

export function findPublicRegistrationStatus(id: string, registrationCode: string) {
  return prisma.registration.findFirst({
      where: { id, registrationCode },
      select: {
        registrationCode: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        statusHistory: {
          select: { toStatus: true, changedAt: true },
          orderBy: { changedAt: "desc" },
          take: 1,
        },
        transactions: {
          select: { status: true, dueAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
}

export function findPublicPaymentInstructions(id: string, registrationCode: string) {
  return prisma.registration.findFirst({
      where: { id, registrationCode },
      select: {
        status: true,
        transactions: {
          select: {
            id: true,
            status: true,
            amountIdr: true,
            dueAt: true,
            currency: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
}
