import { assertBranchAccess, getBranchFilter } from "@/server/auth/branch-scope";
import type { AuthenticatedSession } from "@/server/auth/session";
import { recordActivity } from "@/server/audit/activity-log";
import {
  RegistrationQuerySchema,
  RegistrationTransitionSchema,
} from "@/contracts/registrations";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/http/errors";
import { assertRegistrationTransition } from "@/server/policies/registration.policy";
import {
  toRegistrationDetailDto,
  toRegistrationListDto,
} from "@/server/mappers/registration.mapper";
import {
  archiveRegistration as archiveRegistrationRecord,
  findRegistrationDetail,
  findRegistrationForMutation,
  listRegistrations as listRegistrationRecords,
  transitionRegistration as transitionRegistrationRecord,
  updateRegistration as updateRegistrationRecord,
  type RegistrationUpdateFields,
} from "@/server/repositories/registrations/admin-registration.repository";
import type { z } from "zod";

type RegistrationQuery = z.infer<typeof RegistrationQuerySchema>;
type RegistrationTransition = z.infer<typeof RegistrationTransitionSchema>;

export async function listRegistrations(
  query: RegistrationQuery,
  page: { skip: number; take: number },
  session: AuthenticatedSession,
) {
  const where = {
    deletedAt: null,
    ...(getBranchFilter(session, query.branch_id) ?? {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from
              ? { gte: new Date(`${query.from}T00:00:00.000Z`) }
              : {}),
            ...(query.to
              ? { lte: new Date(`${query.to}T23:59:59.999Z`) }
              : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { registrationCode: { contains: query.q } },
            { childName: { contains: query.q } },
            { guardian: { name: { contains: query.q } } },
            { guardian: { phoneE164: { contains: query.q } } },
          ],
        }
      : {}),
  };
  const [records, total] = await listRegistrationRecords(
    where,
    page.skip,
    page.take,
  );
  return {
    data: records.map(toRegistrationListDto),
    total,
  };
}

export async function getRegistrationDetail(
  id: string,
  session: AuthenticatedSession,
) {
  const record = await findRegistrationDetail(
    id,
    getBranchFilter(session) ?? {},
  );
  if (!record) {
    throw new AppError("NOT_FOUND", "Pendaftaran tidak ditemukan.", 404);
  }
  assertBranchAccess(session, record.branch.id);
  return toRegistrationDetailDto(record);
}

export async function updateRegistration(
  id: string,
  fields: RegistrationUpdateFields,
  reason: string,
  session: AuthenticatedSession,
) {
  if (Object.keys(fields).length === 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Tidak ada field pendaftaran untuk diperbarui.",
      400,
    );
  }
  const current = await findRegistrationForMutation(
    id,
    getBranchFilter(session) ?? {},
  );
  if (!current) {
    throw new AppError("NOT_FOUND", "Pendaftaran tidak ditemukan.", 404);
  }
  assertBranchAccess(session, current.branchId);

  const updated = await prisma.$transaction(async (transaction) => {
    const result = await updateRegistrationRecord(transaction, id, fields);
    await recordActivity(
      {
        actorUserId: session.userId,
        branchId: current.branchId,
        action: "registration.updated",
        entityType: "registration",
        entityId: id,
        metadata: { reason, changed_fields: Object.keys(fields) },
      },
      transaction,
    );
    return result;
  });

  return { id: updated.id, updated_at: updated.updatedAt.toISOString() };
}

export async function archiveRegistration(
  id: string,
  reason: string,
  session: AuthenticatedSession,
) {
  const current = await findRegistrationForMutation(
    id,
    getBranchFilter(session) ?? {},
  );
  if (!current) {
    throw new AppError("NOT_FOUND", "Pendaftaran tidak ditemukan.", 404);
  }
  assertBranchAccess(session, current.branchId);
  assertRegistrationTransition(current.status, "withdrawn", reason);

  await prisma.$transaction(async (transaction) => {
    await archiveRegistrationRecord(transaction, {
      id,
      fromStatus: current.status,
      reason,
      actorUserId: session.userId,
    });
    await recordActivity(
      {
        actorUserId: session.userId,
        branchId: current.branchId,
        action: "registration.archived",
        entityType: "registration",
        entityId: id,
        metadata: { reason },
      },
      transaction,
    );
  });
  return { archived: true };
}

export async function transitionRegistration(
  id: string,
  input: RegistrationTransition,
  session: AuthenticatedSession,
) {
  const current = await findRegistrationForMutation(
    id,
    getBranchFilter(session) ?? {},
  );
  if (!current) {
    throw new AppError("NOT_FOUND", "Pendaftaran tidak ditemukan.", 404);
  }
  assertBranchAccess(session, current.branchId);
  const expectedUpdatedAt = new Date(input.expected_updated_at);
  if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw new AppError(
      "CONFLICT",
      "Pendaftaran telah berubah. Muat ulang sebelum mencoba kembali.",
      409,
    );
  }
  assertRegistrationTransition(current.status, input.to_status, input.reason);

  const updated = await prisma.$transaction(async (transaction) => {
    const result = await transitionRegistrationRecord(transaction, {
      id,
      expectedUpdatedAt,
      fromStatus: current.status,
      toStatus: input.to_status,
      reason: input.reason,
      actorUserId: session.userId,
    });
    if (!result) {
      throw new AppError(
        "CONFLICT",
        "Pendaftaran telah berubah. Muat ulang sebelum mencoba kembali.",
        409,
      );
    }
    await recordActivity(
      {
        actorUserId: session.userId,
        branchId: current.branchId,
        action: "registration.transitioned",
        entityType: "registration",
        entityId: id,
        metadata: {
          from_status: current.status,
          to_status: input.to_status,
          reason: input.reason,
        },
      },
      transaction,
    );
    return result;
  });
  return {
    id,
    status: input.to_status,
    updated_at: updated.updatedAt.toISOString(),
  };
}
