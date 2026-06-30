import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_RECEIPT_PHOTO_BYTES,
  ReceiptPhotoError,
  assertSupportedReceiptPhoto,
  detectImageMimeType,
  photoBytesToDataUri,
} from "./receipt-photo";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
function webp(): Uint8Array {
  const bytes = new Uint8Array(16);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  bytes.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
  return bytes;
}
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // "%PDF-1.7"
const TEXT = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]); // "hello"

// @trace FR-FILE-01, FR-FILE-03
describe("detectImageMimeType", () => {
  it("detects JPEG, PNG, and WEBP from magic bytes", () => {
    expect(detectImageMimeType(JPEG)).toBe("image/jpeg");
    expect(detectImageMimeType(PNG)).toBe("image/png");
    expect(detectImageMimeType(webp())).toBe("image/webp");
  });

  it("returns null for non-image content (PDF, text, empty)", () => {
    expect(detectImageMimeType(PDF)).toBeNull();
    expect(detectImageMimeType(TEXT)).toBeNull();
    expect(detectImageMimeType(new Uint8Array())).toBeNull();
  });

  it("rejects a RIFF container that is not WEBP (e.g. AVI/WAV)", () => {
    const riffAvi = new Uint8Array(16);
    riffAvi.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
    riffAvi.set([0x41, 0x56, 0x49, 0x20], 8); // "AVI "
    expect(detectImageMimeType(riffAvi)).toBeNull();
  });
});

// @trace FR-FILE-02, FR-FILE-03
describe("photoBytesToDataUri", () => {
  it("builds a base64 data URI with the given mime type", () => {
    const uri = photoBytesToDataUri(new Uint8Array([0x01, 0x02, 0x03]), "image/png");
    expect(uri).toBe("data:image/png;base64,AQID");
  });
});

// @trace FR-FILE-01, FR-FILE-02, FR-FILE-03
describe("assertSupportedReceiptPhoto", () => {
  it("accepts a supported image and returns the detected mime + data URI", () => {
    const result = assertSupportedReceiptPhoto({
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      bytes: JPEG,
    });
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.dataUri.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(result.byteLength).toBe(JPEG.length);
  });

  it("trusts magic bytes over the client mime/name (renamed text file is rejected)", () => {
    expect(() =>
      assertSupportedReceiptPhoto({ fileName: "receipt.jpg", mimeType: "image/jpeg", bytes: TEXT }),
    ).toThrowError(ReceiptPhotoError);
  });

  it("rejects a PDF upload", () => {
    expect(() =>
      assertSupportedReceiptPhoto({ fileName: "receipt.pdf", mimeType: "application/pdf", bytes: PDF }),
    ).toThrow(/file-invalid/);
  });

  it("rejects an empty upload", () => {
    try {
      assertSupportedReceiptPhoto({ fileName: "x.jpg", mimeType: "image/jpeg", bytes: new Uint8Array() });
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ReceiptPhotoError);
      expect((error as ReceiptPhotoError).code).toBe("file-invalid");
    }
  });

  it("rejects images larger than the 10 MiB v1 limit", () => {
    const bytes = new Uint8Array(MAX_RECEIPT_PHOTO_BYTES + 1);
    bytes.set(JPEG, 0);
    expect(() =>
      assertSupportedReceiptPhoto({ fileName: "large.jpg", mimeType: "image/jpeg", bytes }),
    ).toThrow(/larger than 10 MiB/);
  });
});

// @trace FR-FILE-01, FR-FILE-02
describe("real receipt fixture", () => {
  it("validates the bundled check.JPEG to a JPEG data URI", () => {
    const bytes = new Uint8Array(
      readFileSync(join(process.cwd(), "docs/test_bank_statements/check.JPEG")),
    );
    expect(detectImageMimeType(bytes)).toBe("image/jpeg");
    const result = assertSupportedReceiptPhoto({
      fileName: "check.JPEG",
      mimeType: "image/jpeg",
      bytes,
    });
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.dataUri.startsWith("data:image/jpeg;base64,")).toBe(true);
  });
});
