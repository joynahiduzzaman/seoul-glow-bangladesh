import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/server/auth";
import { isCloudinaryConfigured, uploadImage } from "@/server/uploads/cloudinary";

// Local-filesystem upload, saved under /public/uploads/products so it's served
// directly by Next.js with zero extra config — good for local dev and a single
// always-on server. LIMITATION: on serverless hosts (e.g. Vercel) the filesystem
// is read-only outside /tmp and isn't shared across instances, so files written
// here won't persist or be visible to other requests in that kind of deployment.
// For production on serverless, swap this for an object-storage upload (S3,
// Cloudinary, etc.) — the admin UI only cares that this route returns a { url }.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const PUBLIC_PATH_PREFIX = "/uploads/products";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

function extensionFor(mimeType: string) {
  return { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" }[mimeType] || "";
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, WEBP, or GIF images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
  }

  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${extensionFor(file.type)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  // Preferred path: object storage. Required on serverless, where the bundle
  // filesystem is read-only and per-invocation.
  if (isCloudinaryConfigured()) {
    try {
      const uploaded = await uploadImage(bytes, filename);
      return NextResponse.json({ url: uploaded.url, publicId: uploaded.publicId }, { status: 201 });
    } catch (err) {
      console.error("[admin/upload] Cloudinary upload failed:", err);
      return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 502 });
    }
  }

  // No credentials configured. On a serverless host there is no usable fallback,
  // so say precisely what is missing rather than failing with an opaque EROFS
  // that an admin would read as "my image was rejected".
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.error("[admin/upload] Cloudinary is not configured and the filesystem is read-only.");
    return NextResponse.json(
      {
        error:
          "Image upload is not configured on this deployment. Set CLOUDINARY_CLOUD_NAME, " +
          "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the environment, then redeploy. " +
          "You can paste an image URL directly in the meantime.",
      },
      { status: 501 }
    );
  }

  // Local development without Cloudinary credentials — keep working off disk.
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  } catch (err) {
    console.error("[admin/upload] write failed:", err);
    return NextResponse.json({ error: "Could not save the image on the server." }, { status: 500 });
  }

  return NextResponse.json({ url: `${PUBLIC_PATH_PREFIX}/${filename}` }, { status: 201 });
}
