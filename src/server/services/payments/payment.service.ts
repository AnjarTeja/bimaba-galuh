import { createHash } from "node:crypto";
import { PaymentReviewSchema } from "@/contracts/payments";
import type { AuthenticatedSession } from "@/server/auth/session";
import { assertBranchAccess, getBranchFilter } from "@/server/auth/branch-scope";
import { recordActivity } from "@/server/audit/activity-log";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/http/errors";
import { executeIdempotent } from "@/server/http/idempotency";
import {
  activateStudentFromRegistration,
  findPaymentForReview,
  findPublicPayment,
  savePaymentProof,
  updateRegistrationAfterPaymentReview,
  updateReviewedPayment,
  updateReviewedProof,
} from "@/server/repositories/payments/payment.repository";
import { inspectUpload } from "@/server/storage/upload-guard";
import { verifyRegistrationAccessToken } from "@/server/security/registration-token";
import type { z } from "zod";

type PaymentReviewInput = z.infer<typeof PaymentReviewSchema>;

export async function uploadRegistrationPaymentProof(input: {
  paymentId: string;
  token: string;
  idempotencyKey: string;
  file: File;
}) {
  const claims = verifyRegistrationAccessToken(input.token);
  if (!claims) {
    throw new AppError("UNAUTHENTICATED", "Token pendaftaran tidak valid.", 401);
  }
  const inspected = await inspectUpload(input.file);
  const checksum = createHash("sha256").update(inspected.bytes).digest("hex");
  const payment = await findPublicPayment(
    input.paymentId,
    claims.registration_id,
    claims.registration_code,
  );
  if (!payment) {
    throw new AppError("NOT_FOUND", "Transaksi pembayaran tidak ditemukan.", 404);
  }
  if (
    !["pending", "rejected"].includes(payment.status) ||
    !["awaiting_payment", "follow_up_required"].includes(
      payment.registration.status,
    )
  ) {
    throw new AppError(
      "CONFLICT",
      "Bukti pembayaran tidak dapat diunggah untuk transaksi ini.",
      409,
    );
  }

  const outcome = await executeIdempotent({
    scope: `public-payment-proof:${input.paymentId}:${claims.registration_id}`,
    key: input.idempotencyKey,
    fingerprint: checksum,
    status: 201,
    execute: async () => {
      const proof = await savePaymentProof({
        paymentId: input.paymentId,
        registrationId: claims.registration_id,
        bytes: inspected.bytes,
        mimeType: inspected.mimeType,
        sizeBytes: BigInt(inspected.bytes.byteLength),
        checksum,
      });
      if (!proof) {
        throw new AppError(
          "CONFLICT",
          "Transaksi sudah berubah; silakan muat ulang.",
          409,
        );
      }
      return {
        proof_id: proof.id,
        review_status: "pending",
        uploaded_at: proof.uploadedAt.toISOString(),
      };
    },
  });
  return outcome;
}

export async function reviewRegistrationPayment(
  id: string,
  input: PaymentReviewInput,
  session: AuthenticatedSession,
) {
  const result = await prisma.$transaction(async (transaction) => {
    const payment = await findPaymentForReview(
      transaction,
      id,
      getBranchFilter(session) ?? {},
    );
    if (!payment) {
      throw new AppError("NOT_FOUND", "Transaksi pembayaran tidak ditemukan.", 404);
    }
    assertBranchAccess(session, payment.registration.branchId);
    if (payment.status !== "proof_submitted" || payment.proofs.length === 0) {
      throw new AppError(
        "CONFLICT",
        "Tidak ada bukti pembayaran yang menunggu verifikasi.",
        409,
      );
    }
    const approved = input.decision === "approve";
    const reason = input.decision === "reject" ? input.reason : undefined;
    if (
      approved &&
      payment.registration.status !== "awaiting_verification"
    ) {
      throw new AppError(
        "CONFLICT",
        "Status pendaftaran tidak siap untuk konfirmasi pembayaran.",
        409,
      );
    }
    if (
      !approved &&
      !["awaiting_verification", "under_review"].includes(
        payment.registration.status,
      )
    ) {
      throw new AppError(
        "CONFLICT",
        "Status pendaftaran tidak siap untuk penolakan bukti.",
        409,
      );
    }
    const changed = await updateReviewedPayment(transaction, {
      id,
      reviewerId: session.userId,
      approved,
    });
    if (changed.count !== 1) {
      throw new AppError(
        "CONFLICT",
        "Transaksi telah berubah; muat ulang halaman.",
        409,
      );
    }
    const proofChanged = await updateReviewedProof(transaction, {
      proofId: payment.proofs[0].id,
      reviewerId: session.userId,
      approved,
      reason,
    });
    if (proofChanged.count !== 1) {
      throw new AppError(
        "CONFLICT",
        "Bukti pembayaran telah berubah; muat ulang halaman.",
        409,
      );
    }
    await updateRegistrationAfterPaymentReview(transaction, {
      id: payment.registrationId,
      fromStatus: payment.registration.status,
      approved,
      reviewerId: session.userId,
      reason,
    });

    let studentId: string | null = null;
    if (approved) {
      const student = await activateStudentFromRegistration(
        transaction,
        payment.registration,
      );
      studentId = student.id;
    }
    await recordActivity(
      {
        actorUserId: session.userId,
        branchId: payment.registration.branchId,
        action: approved ? "payment.verified" : "payment.proof_rejected",
        entityType: "payment_transaction",
        entityId: id,
        metadata: approved
          ? {
              student_id: studentId,
              registration_id: payment.registrationId,
            }
          : { reason },
      },
      transaction,
    );
    return { decision: input.decision, studentId };
  });
  return { decision: result.decision, student_id: result.studentId };
}
