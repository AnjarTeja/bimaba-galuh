import assert from "node:assert/strict";
import { test } from "node:test";
import { CreateRegistrationSchema } from "../src/contracts/registrations";
import { buildCsv } from "../src/server/csv/csv-builder";
import { hashPassword, verifyPassword } from "../src/server/auth/password";
import { assertRegistrationTransition } from "../src/server/policies/registration.policy";
import {
  createRegistrationAccessToken,
  verifyRegistrationAccessToken,
} from "../src/server/security/registration-token";

test("CSV output quotes values and neutralizes spreadsheet formulas", () => {
  assert.equal(
    buildCsv([["=1+1", "Nama, Wali", 'Anak "A"']], ["kode", "wali", "anak"]),
    '"kode","wali","anak"\r\n"\'=1+1","Nama, Wali","Anak ""A"""',
  );
});

test("registration contract normalizes birth date and rejects an invalid phone", () => {
  const parsed = CreateRegistrationSchema.parse({
    child_name: "DEMO Anak",
    birth_date: "2020-03-10",
    address: "DEMO",
    guardian: { name: "DEMO Wali", phone_e164: "+628123456789" },
    branch_id: "c1f98f1e-99e4-4a43-8e24-76454628d28b",
    consents: [
      {
        consent_type: "registration_processing",
        policy_version: "DEMO-1",
        granted: true,
      },
    ],
  });
  assert.equal(parsed.birth_date.toISOString(), "2020-03-10T00:00:00.000Z");
  assert.throws(() =>
    CreateRegistrationSchema.parse({
      child_name: "DEMO Anak",
      birth_date: "2020-03-10",
      address: "DEMO",
      guardian: { name: "DEMO Wali", phone_e164: "08123456789" },
      branch_id: "c1f98f1e-99e4-4a43-8e24-76454628d28b",
      consents: [],
    }),
  );
});

test("registration transitions reject terminal-state changes and require rejection reason", () => {
  assert.throws(() => assertRegistrationTransition("confirmed", "rejected", "alasan"));
  assert.throws(() => assertRegistrationTransition("under_review", "rejected"));
  assert.doesNotThrow(() =>
    assertRegistrationTransition("under_review", "rejected", "Data tidak lengkap"),
  );
  assert.throws(() => assertRegistrationTransition("awaiting_verification", "confirmed"));
});

test("password hashes verify only the original password", async () => {
  const hash = await hashPassword("password-DEMO-kuat-123");
  assert.equal(await verifyPassword("password-DEMO-kuat-123", hash), true);
  assert.equal(await verifyPassword("password-DEMO-lain-123", hash), false);
});

test("registration access tokens are signed and reject tampering", () => {
  process.env.DATABASE_HOST ??= "localhost";
  process.env.DATABASE_PORT ??= "3306";
  process.env.DATABASE_USER ??= "test";
  process.env.DATABASE_PASSWORD ??= "test";
  process.env.DATABASE_NAME ??= "test";
  process.env.APP_TOKEN_SECRET = "DEMO-only-test-secret-with-more-than-32-characters";

  const token = createRegistrationAccessToken(
    "c1f98f1e-99e4-4a43-8e24-76454628d28b",
    "BG-DEMO-001",
  );
  assert.equal(verifyRegistrationAccessToken(token)?.registration_code, "BG-DEMO-001");
  assert.equal(verifyRegistrationAccessToken(`${token}x`), null);
});
