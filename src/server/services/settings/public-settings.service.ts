import { z } from "zod";
import { AppError } from "@/server/http/errors";
import {
  findRegistrationPaymentSettings,
  listPublicSettings,
} from "@/server/repositories/settings/settings.repository";

const PaymentInstructionsSchema = z.object({
  bank_name: z.string().max(191).optional(),
  account_name: z.string().max(191).optional(),
  account_number: z.string().max(191).optional(),
  virtual_account: z.string().max(191).optional(),
  instructions: z.string().max(5000).optional(),
  registration_due_days: z.number().int().min(1).max(90).optional(),
});

export async function getRegistrationPaymentSettings() {
  const [feeSetting, instructionsSetting] = await findRegistrationPaymentSettings();
  const feeParsed = z.number().int().nonnegative().safe().safeParse(
    typeof feeSetting?.value === "object" &&
      feeSetting.value !== null &&
      "amount_idr" in feeSetting.value
      ? feeSetting.value.amount_idr
      : feeSetting?.value,
  );
  if (!feeParsed.success) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Biaya pendaftaran belum dikonfigurasi oleh administrator.",
      503,
    );
  }

  const instructionsParsed = PaymentInstructionsSchema.safeParse(
    instructionsSetting?.value,
  );
  if (!instructionsParsed.success && instructionsSetting) {
    throw new Error("Stored payment instructions have an invalid format.");
  }
  const instructions = instructionsParsed.success ? instructionsParsed.data : {};
  return {
    amountIdr: BigInt(feeParsed.data),
    instructions,
  };
}

export async function getPublicSettings() {
  const settings = await listPublicSettings();
  return Object.fromEntries(
    settings.map(({ key, value }) => [key.replace("public.", ""), value]),
  );
}
