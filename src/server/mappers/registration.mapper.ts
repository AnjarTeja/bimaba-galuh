import type {
  findRegistrationDetail,
  listRegistrations,
} from "@/server/repositories/registrations/admin-registration.repository";

type RegistrationDetail = NonNullable<
  Awaited<ReturnType<typeof findRegistrationDetail>>
>;

export function toRegistrationDetailDto(record: RegistrationDetail) {
  return {
    id: record.id,
    registration_code: record.registrationCode,
    child_name: record.childName,
    birth_date: record.birthDate.toISOString().slice(0, 10),
    religion: record.religion,
    gender: record.gender,
    address: record.address,
    consultation_at: record.consultationAt?.toISOString() ?? null,
    notes: record.notes,
    status: record.status,
    submitted_at: record.submittedAt.toISOString(),
    reviewed_at: record.reviewedAt?.toISOString() ?? null,
    updated_at: record.updatedAt.toISOString(),
    guardian: {
      id: record.guardian.id,
      name: record.guardian.name,
      phone_e164: record.guardian.phoneE164,
      email: record.guardian.email,
    },
    branch: record.branch,
    consents: record.consents.map((consent) => ({
      consent_type: consent.consentType,
      policy_version: consent.policyVersion,
      granted: consent.granted,
      granted_at: consent.grantedAt?.toISOString() ?? null,
      revoked_at: consent.revokedAt?.toISOString() ?? null,
    })),
    status_history: record.statusHistory.map((history) => ({
      from_status: history.fromStatus,
      to_status: history.toStatus,
      reason: history.reason,
      changed_at: history.changedAt.toISOString(),
      changed_by: history.changedBy?.fullName ?? null,
    })),
    transactions: record.transactions.map((transaction) => ({
      id: transaction.id,
      amount_idr: transaction.amountIdr.toString(),
      currency: transaction.currency,
      status: transaction.status,
      provider: transaction.provider,
      due_at: transaction.dueAt?.toISOString() ?? null,
      paid_at: transaction.paidAt?.toISOString() ?? null,
      proofs: transaction.proofs.map((proof) => ({
        id: proof.id,
        review_status: proof.reviewStatus,
        uploaded_at: proof.uploadedAt.toISOString(),
        reviewed_at: proof.reviewedAt?.toISOString() ?? null,
        rejection_reason: proof.rejectionReason,
        mime_type: proof.mediaAsset.mimeType,
        size_bytes: proof.mediaAsset.sizeBytes.toString(),
        file_url: `/api/v1/admin/media/${proof.mediaAsset.id}/file`,
      })),
    })),
  };
}

type RegistrationList = Awaited<ReturnType<typeof listRegistrations>>[0][number];

export function toRegistrationListDto(record: RegistrationList) {
  const {
    registrationCode,
    childName,
    birthDate,
    submittedAt,
    updatedAt,
    guardian,
    branch,
    transactions,
    ...rest
  } = record;
  return {
    ...rest,
    registration_code: registrationCode,
    child_name: childName,
    birth_date: birthDate.toISOString().slice(0, 10),
    submitted_at: submittedAt.toISOString(),
    updated_at: updatedAt.toISOString(),
    guardian: { name: guardian.name, phone_e164: guardian.phoneE164 },
    branch,
    payment: transactions[0]
      ? {
          amount_idr: transactions[0].amountIdr.toString(),
          status: transactions[0].status,
          due_at: transactions[0].dueAt?.toISOString() ?? null,
        }
      : null,
  };
}
