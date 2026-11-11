# Backend API Bimba AIUEO Galuh

Base path: `/api/v1`. JSON endpoints use the envelope `{"data": ...}`; validation and application errors use `{"error":{"code":"...","message":"..."}}`.

## Backend layering

All API route handlers follow the same boundaries:

- `src/app/api/v1/**/route.ts` handles HTTP concerns: authentication, request parsing, rate limits, and response formatting.
- `src/server/services/<domain>/` coordinates domain rules, authorization decisions, and transactions without depending on `Request` or `Response`.
- `src/server/repositories/<domain>/` owns Prisma reads and writes. Keep query construction and persistence out of route handlers.
- `src/server/mappers/` converts database records to public/admin DTOs when mapping is shared or non-trivial.

Shared HTTP helpers such as rate limiting and idempotency delegate their database operations to `src/server/repositories/http/`. When adding an endpoint, keep its route thin and add the domain operation to the matching service and repository.

## Payment and file-storage behavior

Payments use manual bank transfer instructions configured by administrators. Applicants upload proof; an authorized administrator approves or rejects it. There is no payment gateway, automatic charge, or webhook.

Uploads are validated (maximum 5 MB; JPEG, PNG, WebP, or PDF) and stored as MySQL `LONGBLOB` data in `MediaAsset.content`. The media metadata and bytes are written together. This is a temporary deployment choice: database size, backup duration, and restore costs can grow quickly, so migrate to private object storage before substantial production use.

## Local setup

1. Copy `.env.example` to `.env` and set the MySQL connection values. Set `APP_TOKEN_SECRET` to a private random value of at least 32 characters; registration access tokens cannot be issued without it.
2. Apply pending schema changes and generate Prisma Client:

   ```bash
   npx prisma migrate dev --config prisma.config.ts --name backend_api_updates
   npx prisma generate --config prisma.config.ts
   ```

   If the earlier API-infrastructure migration was already applied, this migration includes any still-pending registration archive/guardian-phone changes and the nullable `MediaAsset.content` blob column.

3. Create the permission roles and clearly marked demo branch:

   ```bash
   npx prisma db seed --config prisma.config.ts
   ```

4. Bootstrap the first central administrator. Set `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD` in the current shell only, then run:

   ```bash
   npm run admin:create
   ```

   The password must have at least 12 characters. The script refuses to overwrite an existing account.
5. Sign in, then configure `registration_fee_idr`, `payment_instructions`, and any public site settings through `PATCH /api/v1/admin/settings`.

All mutation requests from browser clients must include the same-origin `Origin` header. Admin sessions use the `HttpOnly` `bimba_session` cookie. Important POST operations require an `Idempotency-Key`.

## Route inventory

### Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/public/site` | Public site settings |
| GET | `/public/branches` | Verified active branches |
| GET | `/public/branches/{slug}` | Verified active branch detail |
| GET | `/public/staff` | Published active staff |
| GET | `/public/events` | Published events and consented media |
| GET | `/public/media/{id}` | Publicly published image with valid consent |
| POST | `/public/registrations` | Validate and create registration, payment transaction, consents, and history |
| POST | `/public/registrations/status` | Minimal registration status using registration access token |
| GET | `/public/registrations/{code}/payment-instructions` | Payment details; send access token as `Authorization: Bearer ...` |
| POST | `/public/payments/{id}/proof` | Upload private proof using multipart field `file` and registration access token |
| POST | `/public/messages` | Submit a contact message and record contact consent |

The registration response returns a registration access token. Keep it private; send it in the `Authorization` header for status, payment-instruction, and proof-upload calls. It expires after 90 days. Registration submission and proof upload require `Idempotency-Key`.

The route names intentionally use `/public/registrations/status` and `/admin/media` for consistency with the versioned API naming and media resource. SPP uniform deliveries use `POST` to append a delivery event rather than replacing prior history.

### Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Rate-limited email/password login |
| POST | `/auth/logout` | Revoke session and clear cookie |
| GET | `/auth/me` | Current user and role scopes |
| POST | `/auth/forgot-password` | Generic response; development writes a reset link to the server log |
| POST | `/auth/reset-password` | Consume a one-time reset token and revoke all sessions |

Password-reset email delivery is not configured. The forgot-password endpoint deliberately returns `503` in production until a mail-delivery provider is selected and integrated.

### Admin

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/dashboard` | Scoped operational counts |
| GET | `/admin/registrations` | Search/filter registrations |
| GET, PATCH, DELETE | `/admin/registrations/{id}` | Detail, update with reason, or archive |
| POST | `/admin/registrations/{id}/transition` | Validated status transition with optimistic concurrency |
| POST | `/admin/payments/{id}/review` | Approve/reject proof; approval creates exactly one student transactionally |
| GET, POST | `/admin/students` | Search/list and manually create students |
| GET, PATCH | `/admin/students/{id}` | Read/update student |
| GET, POST | `/admin/students/{id}/spp-invoices` | List/create SPP invoices |
| POST | `/admin/spp-invoices/{id}/payments` | Record an SPP payment; requires `Idempotency-Key` |
| POST | `/admin/students/{id}/uniform-deliveries` | Append a uniform delivery record |
| POST | `/admin/students/{id}/graduation` | Graduate an active student |
| GET, POST | `/admin/branches` | List/create branches |
| GET, PATCH, DELETE | `/admin/branches/{id}` | Read/update/deactivate a branch |
| GET, POST | `/admin/staff` | List/create staff |
| PATCH, DELETE | `/admin/staff/{id}` | Update/archive staff |
| GET, POST | `/admin/events` | List/create events |
| PATCH, DELETE | `/admin/events/{id}` | Update/archive event |
| POST | `/admin/events/{id}/publication-review` | Publish/reject after media-consent checks |
| GET, PATCH | `/admin/messages` | List and handle messages |
| POST | `/admin/media` | Upload private media |
| GET | `/admin/media/{id}/file` | Authenticated, branch-scoped private file access |
| GET | `/admin/activity-logs` | Read-only scoped audit log |
| GET | `/admin/exports/registrations` | Sanitized registrations CSV |
| GET | `/admin/exports/students` | Minimized students CSV |
| GET | `/admin/exports/reports` | Aggregate report CSV |
| GET, PATCH | `/admin/settings` | Read/update central settings |

Admin resources are checked against the session role and assigned branch scope. Branch identifiers supplied by clients do not expand that scope.

## Deployment-dependent features and limits

- Payment-proof verification is manual. No payment gateway or webhook is enabled by design.
- Uploads are stored in the MySQL database as `LONGBLOB` (maximum 5 MB). Configure private object storage and malware scanning before substantial production use.
- Production email delivery for password recovery is not available yet.
- The database retains private child/guardian data; configure retention, backups, and access policies before collecting real data.
