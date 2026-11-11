import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/server/http/errors";
import {
  createSessionRecord,
  hashSessionToken,
  resolveSessionRecord,
  revokeSessionRecord,
  SESSION_TTL_SECONDS,
} from "@/server/repositories/auth/session.repository";

export const SESSION_COOKIE_NAME = "bimba_session";
export { hashSessionToken, SESSION_TTL_SECONDS };

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export type AuthenticatedSession = {
  id: string;
  userId: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    fullName: string;
    active: boolean;
    branchRoles: Array<{
      branchId: string | null;
      role: { code: string };
    }>;
  };
};

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await createSessionRecord(userId, token, expiresAt);
  return { token, expiresAt };
}

export function resolveSession(token: string | undefined) {
  return resolveSessionRecord(token);
}

export async function getRequestSession(request: NextRequest) {
  return resolveSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireSession(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    throw new AppError("UNAUTHENTICATED", "Silakan masuk terlebih dahulu.", 401);
  }
  return session;
}

export function revokeSession(token: string | undefined) {
  return revokeSessionRecord(token);
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    ...sessionCookieOptions,
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  return response;
}
