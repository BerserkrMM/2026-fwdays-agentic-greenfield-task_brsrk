// Receipt-photo domain — framework-free (TC-PURE-01). Deterministic, keyless
// validation and preparation of one uploaded receipt image for the file-imports
// channel (FR-FILE-01..03). It trusts the file *content* (magic bytes), not the
// client-supplied name/MIME, and builds the `data:` URI used both as the
// preserved original on the input_event and as the vision parser payload. No
// binary EXIF/metadata stripping is performed in v1 (documented deferral).

export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

/** User-selected v1 guardrail for receipt-photo uploads (10 MiB). */
export const MAX_RECEIPT_PHOTO_BYTES = 10 * 1024 * 1024;

export type ReceiptPhotoErrorCode = "file-invalid";

export class ReceiptPhotoError extends Error {
  constructor(
    public readonly code: ReceiptPhotoErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ReceiptPhotoError";
  }
}

export interface SupportedReceiptPhoto {
  mimeType: SupportedImageMime;
  /** `data:<mime>;base64,…` of the original bytes (preserved + sent to AI). */
  dataUri: string;
  byteLength: number;
}

// Magic-byte signatures keyed by MIME. Each signature is one or more
// (offset, bytes) segments that must all match. WEBP is `RIFF....WEBP`, so it
// uses two segments. Table-driven so the matcher stays flat and low-complexity.
const IMAGE_SIGNATURES: ReadonlyArray<{
  mime: SupportedImageMime;
  segments: ReadonlyArray<{ offset: number; bytes: readonly number[] }>;
}> = [
  { mime: "image/jpeg", segments: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }] },
  {
    mime: "image/png",
    segments: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  },
  {
    mime: "image/webp",
    segments: [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // "WEBP"
    ],
  },
];

function segmentMatches(
  bytes: Uint8Array,
  segment: { offset: number; bytes: readonly number[] },
): boolean {
  return segment.bytes.every((value, index) => bytes[segment.offset + index] === value);
}

/**
 * Detects a supported image type from the leading bytes, or null when the
 * content is not a JPEG/PNG/WEBP (so a renamed PDF/text file is rejected).
 */
export function detectImageMimeType(bytes: Uint8Array): SupportedImageMime | null {
  for (const signature of IMAGE_SIGNATURES) {
    if (signature.segments.every((segment) => segmentMatches(bytes, segment))) {
      return signature.mime;
    }
  }
  return null;
}

/** Builds a `data:` URI from raw bytes (server-side; Node Buffer). */
export function photoBytesToDataUri(bytes: Uint8Array, mimeType: string): string {
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Validates one uploaded receipt image deterministically and returns the detected
 * MIME plus the `data:` URI. Rejects empty uploads and any content that is not a
 * supported image (FR-FILE-01/03). The original bytes are preserved as-is in the
 * returned data URI (NFR-PRIV-02).
 */
export function assertSupportedReceiptPhoto(input: {
  fileName: unknown;
  mimeType: unknown;
  bytes: Uint8Array;
}): SupportedReceiptPhoto {
  const { bytes } = input;
  if (!bytes || bytes.length === 0) {
    throw new ReceiptPhotoError("file-invalid", "file-invalid: empty upload");
  }
  if (bytes.length > MAX_RECEIPT_PHOTO_BYTES) {
    throw new ReceiptPhotoError("file-invalid", "file-invalid: image is larger than 10 MiB");
  }
  const mimeType = detectImageMimeType(bytes);
  if (!mimeType) {
    throw new ReceiptPhotoError(
      "file-invalid",
      "file-invalid: unsupported image (expected JPEG, PNG, or WEBP)",
    );
  }
  return {
    mimeType,
    dataUri: photoBytesToDataUri(bytes, mimeType),
    byteLength: bytes.length,
  };
}
