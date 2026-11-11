import { createHash, randomBytes } from "node:crypto";
import type { z } from "zod";
import {
  ForgotPasswordSchema,
  LoginSchema,
  ResetPasswordSchema,
} from "@/contracts/auth";
import { verifyPassword, hashPassword } from "@/server/auth/password";
import type { AuthenticatedSession } from "@/server/auth/session";
import { getEnvironment } from "@/server/config/env";
import { AppError } from "@/server/http/errors";
import {
  consumeAuthRateLimit,
  consumePasswordResetToken,
  createPasswordResetToken,
  findLoginUser,
  findPasswordResetToken,
  findPasswordResetUser,
  recordLoginActivity,
  recordPasswordResetActivity,
  updateLastLogin,
} from "@/server/repositories/auth/auth.repository";
import {
  createSessionRecord,
  revokeSessionRecord,
  SESSION_TTL_SECONDS,
} from "@/server/repositories/auth/session.repository";

type LoginInput = z.infer<typeof LoginSchema>;
type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

async function enforceAuthRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const result = await consumeAuthRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
    );
    throw new AppError(
      "RATE_LIMITED",
      "Terlalu banyak permintaan. Silakan coba kembali nanti.",
      429,
      undefined,
      retryAfterSeconds,
    );
  }
}

export async function login(
  input: LoginInput,
  address: string,
) {
  const email = input.email.trim().toLowerCase();
  await enforceAuthRateLimit(
    `login:${address}:${email}`,
    10,
    15 * 60 * 1000,
  );

  const user = await findLoginUser(email);
  const validPassword = user
    ? await verifyPassword(input.password, user.passwordHash)
    : false;
  if (!user || !user.active || !validPassword) {
    throw new AppError("UNAUTHENTICATED", "Email atau kata sandi tidak sesuai.", 401);
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await createSessionRecord(user.id, token, expiresAt);
  await updateLastLogin(user.id, new Date());
  await recordLoginActivity(user.id);

  return {
    token,
    data: {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        roles: user.branchRoles.map(({ role, branchId, branch }) => ({
          code: role.code,
          name: role.name,
          branch_id: branchId,
          branch_name: branch?.name ?? null,
        })),
      },
      expires_at: expiresAt.toISOString(),
    },
  };
}

export function logout(token: string | undefined) {
  return revokeSessionRecord(token);
}

export function getCurrentUser(session: AuthenticatedSession) {
  return {
    id: session.user.id,
    email: session.user.email,
    full_name: session.user.fullName,
    roles: session.user.branchRoles.map(({ role, branchId }) => ({
      code: role.code,
      branch_id: branchId,
    })),
    expires_at: session.expiresAt.toISOString(),
  };
}

export async function forgotPassword(
  input: ForgotPasswordInput,
  address: string,
  requestOrigin: string,
) {
  const email = input.email.trim().toLowerCase();
  await enforceAuthRateLimit(
    `forgot-password:${address}:${email}`,
    5,
    60 * 60 * 1000,
  );

  if (getEnvironment().NODE_ENV === "production") {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Pemulihan kata sandi belum dikonfigurasi. Hubungi administrator.",
      503,
    );
  }

  const user = await findPasswordResetUser(email);
  if (user?.active) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await createPasswordResetToken(
      user.id,
      tokenHash,
      new Date(Date.now() + 30 * 60 * 1000),
    );
    const baseUrl = getEnvironment().PUBLIC_SITE_URL ?? requestOrigin;
    console.info("DEVELOPMENT password reset link", {
      email: user.email,
      url: `${baseUrl}/lupa-password?token=${encodeURIComponent(token)}`,
      expires_in_minutes: 30,
    });
  }
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  const resetToken = await findPasswordResetToken(tokenHash);
  const now = new Date();
  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt <= now
  ) {
    throw new AppError(
      "NOT_FOUND",
      "Token pemulihan tidak valid atau kedaluwarsa.",
      400,
    );
  }

  const passwordHash = await hashPassword(input.new_password);
  const consumed = await consumePasswordResetToken({
    id: resetToken.id,
    tokenHash,
    userId: resetToken.userId,
    passwordHash,
    now: new Date(),
  });
  if (!consumed) {
    throw new AppError("CONFLICT", "Token pemulihan sudah digunakan.", 409);
  }

  await recordPasswordResetActivity(resetToken.userId);
}
