import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary-backed image storage for product images.
 *
 * The previous implementation wrote into public/uploads/products, which works on
 * a single always-on server but not on serverless hosting: the bundle filesystem
 * is read-only, and even /tmp is per-invocation and never web-served. Uploads on
 * Vercel therefore failed outright.
 *
 * Credentials are optional. When they are absent the caller falls back to the
 * local filesystem, so `npm run dev` keeps working for anyone who has not signed
 * up for Cloudinary — which is why this module never throws at import time.
 */
export const CLOUDINARY_FOLDER = "seoul-glow-bangladesh/products";

const REQUIRED_VARS = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const;

/**
 * Names of the credentials that are absent or blank. Returns names only — never
 * values — so it is safe to surface in an error response. A variable that exists
 * but holds an empty string counts as missing, which is the usual outcome of
 * bulk-pasting an .env template whose placeholders were never filled in.
 */
export function missingCloudinaryVars(): string[] {
  return REQUIRED_VARS.filter((k) => !process.env[k] || process.env[k]!.trim() === "");
}

export function isCloudinaryConfigured(): boolean {
  return missingCloudinaryVars().length === 0;
}

let configured = false;
function configure() {
  if (configured) return;
  // Trim every credential. Pasting into a dashboard field routinely captures a
  // trailing newline or space, and for the secret that is not a harmless typo:
  // it is mixed into the request signature, so the only symptom is Cloudinary
  // rejecting an otherwise correct upload with "Invalid Signature".
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    api_key: process.env.CLOUDINARY_API_KEY?.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
    secure: true, // never hand back an http:// URL to embed in the storefront
  });
  configured = true;
}

export interface UploadedImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  bytes?: number;
}

/**
 * Uploads image bytes and resolves to the HTTPS delivery URL. The SDK's upload
 * API is stream-based, so the buffer is fed through upload_stream rather than
 * written to a temporary file (there is nowhere to write one).
 */
export async function uploadImage(bytes: Buffer, filename: string): Promise<UploadedImage> {
  configure();

  return new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        resource_type: "image",
        // The caller already prefixes a timestamp and a UUID fragment, so the id
        // is unique on its own. use_filename/unique_filename are deliberately
        // omitted: Cloudinary ignores them whenever an explicit public_id is
        // given, and passing all three together is contradictory.
        public_id: filename.replace(/\.[^.]+$/, ""),
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary returned no result"));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        });
      }
    );
    stream.end(bytes);
  });
}

/** Best-effort removal; callers treat failure as non-fatal. */
export async function deleteImage(publicId: string): Promise<void> {
  configure();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
