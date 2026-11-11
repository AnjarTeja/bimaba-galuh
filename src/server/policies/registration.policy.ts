import { AppError } from "@/server/http/errors";

const transitions: Record<string, readonly string[]> = {
  submitted: ["awaiting_payment", "under_review", "withdrawn", "expired"],
  awaiting_payment: ["awaiting_verification", "under_review", "withdrawn", "expired"],
  awaiting_verification: ["under_review", "confirmed", "rejected", "follow_up_required"],
  under_review: ["awaiting_payment", "awaiting_verification", "confirmed", "rejected", "follow_up_required", "withdrawn"],
  follow_up_required: ["under_review", "awaiting_payment", "awaiting_verification", "withdrawn", "expired"],
  confirmed: [],
  rejected: [],
  withdrawn: [],
  expired: [],
};

export function assertRegistrationTransition(
  from: string,
  to: string,
  reason?: string,
) {
  if (to === "confirmed") {
    throw new AppError(
      "CONFLICT",
      "Pendaftaran hanya dapat dikonfirmasi melalui verifikasi pembayaran.",
      409,
    );
  }
  if (!transitions[from]?.includes(to)) {
    throw new AppError(
      "CONFLICT",
      `Perubahan status pendaftaran dari ${from} ke ${to} tidak diizinkan.`,
      409,
    );
  }
  if (to === "rejected" && !reason?.trim()) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Alasan penolakan wajib diisi.",
      400,
      { reason: ["Alasan penolakan wajib diisi."] },
    );
  }
}
