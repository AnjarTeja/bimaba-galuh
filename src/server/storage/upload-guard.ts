import { AppError } from "@/server/http/errors";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
]);

export async function inspectUpload(file: File) {
  if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", "Ukuran file maksimal 5 MB.", 413);
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) {
    throw new AppError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Format file yang didukung: JPEG, PNG, WebP, atau PDF.",
      415,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesFileSignature(file.type, bytes)) {
    throw new AppError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Isi file tidak sesuai dengan jenis file yang dikirim.",
      415,
    );
  }

  return { bytes, extension, mimeType: file.type };
}

function matchesFileSignature(mimeType: string, bytes: Uint8Array) {
  switch (mimeType) {
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );
    case "image/webp":
      return (
        bytes.length >= 12 &&
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
      );
    case "application/pdf":
      return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
    default:
      return false;
  }
}
