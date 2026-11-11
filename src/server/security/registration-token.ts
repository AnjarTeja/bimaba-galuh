import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnvironment } from "@/server/config/env";
import { AppError } from "@/server/http/errors";

type RegistrationClaims = {
  purpose: "registration_access";
  registration_id: string;
  registration_code: string;
  expires_at: number;
};

function sign(payload: string) {
  const secret = getEnvironment().APP_TOKEN_SECRET;
  if (!secret) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Token pendaftaran belum dikonfigurasi oleh administrator.",
      503,
    );
  }
  return createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export function assertRegistrationTokenConfigured() {
  if (!getEnvironment().APP_TOKEN_SECRET) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Token pendaftaran belum dikonfigurasi oleh administrator.",
      503,
    );
  }
}

export function createRegistrationAccessToken(
  registrationId: string,
  registrationCode: string,
) {
  const claims: RegistrationClaims = {
    purpose: "registration_access",
    registration_id: registrationId,
    registration_code: registrationCode,
    expires_at: Date.now() + 90 * 24 * 60 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyRegistrationAccessToken(token: string) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) {
    return null;
  }

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as RegistrationClaims;
    if (
      claims.purpose !== "registration_access" ||
      typeof claims.registration_id !== "string" ||
      typeof claims.registration_code !== "string" ||
      !Number.isSafeInteger(claims.expires_at) ||
      claims.expires_at <= Date.now()
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
