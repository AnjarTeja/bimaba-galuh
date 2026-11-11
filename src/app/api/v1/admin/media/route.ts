import { withAuth } from "@/server/auth/with-auth";
import { AppError } from "@/server/http/errors";
import { requestAddress } from "@/server/http/pagination";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { created } from "@/server/http/response";
import { uploadMedia } from "@/server/services/media/media.service";

export const POST = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, _context, session) => {
    await enforceRateLimit({
      key: `media-upload:${session.userId}:${requestAddress(request)}`,
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data;")) {
      throw new AppError(
        "UNSUPPORTED_MEDIA_TYPE",
        "Upload harus menggunakan multipart/form-data.",
        415,
      );
    }
    const contentLength = Number(request.headers.get("content-length"));
    if (!Number.isFinite(contentLength) || contentLength > 5.5 * 1024 * 1024) {
      throw new AppError("PAYLOAD_TOO_LARGE", "Ukuran request maksimal 5 MB.", 413);
    }
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "Field file wajib diisi.", 400);
    }
    return created(await uploadMedia(file, session));
  },
);
