import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/server/auth";
import { isCloudinaryConfigured, missingCloudinaryVars, uploadImage } from "@/server/uploads/cloudinary";

// Uploads go to Cloudinary when configured; the local filesystem path below is a
// development convenience only. On serverless hosts the bundle directory is
// read-only and /tmp is per-invocation and never web-served, so files written
// there would not survive or be reachable.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const PUBLIC_PATH_PREFIX = "/uploads/products";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Vercel rejects serverless request bodies over ~4.5 MB at the platform edge,
// before any of this code runs — the caller gets a bare 413 with no usable
// message. The previous 5 MB ceiling was therefore unreachable in production: a
// 4.6-5 MB image looked "allowed" but failed with an opaque platform error. Cap
// below the platform limit, with headroom for multipart encoding overhead, so our
// own validation is what actually fires and the admin sees a real explanation.
const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB — must stay under Vercel's ~4.5MB body limit

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
    return NextResponse.json({ error: "Image must be under 4MB" }, { status: 400 });
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
      // Surface Cloudinary's own reason. Its failures are configuration
      // diagnostics ("Invalid api_key", "Invalid Signature", "Invalid cloud_name")
      // rather than anything sensitive, and without them a 502 is indistinguishable
      // from a network blip — leaving an admin no way to tell a typo'd key from an
      // outage. Only the provider's message is echoed, never our credentials.
      const reason =
        (err as { message?: string })?.message ??
        (typeof err === "string" ? err : "unknown error");
      console.error("[admin/upload] Cloudinary upload failed:", reason, err);
      return NextResponse.json(
        { error: `Image upload failed: ${reason}`, provider: "cloudinary" },
        { status: 502 }
      );
    }
  }

  // No credentials configured. On a serverless host there is no usable fallback,
  // so say precisely what is missing rather than failing with an opaque EROFS
  // that an admin would read as "my image was rejected".
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Name the specific variables that are missing. Vercel snapshots environment
    // variables into a deployment when it is created, so adding them in project
    // settings does nothing until a redeploy — which is indistinguishable from a
    // typo or a blank value unless the error says which names it could not see.
    const missing = missingCloudinaryVars();
    console.error("[admin/upload] Cloudinary not configured; missing:", missing.join(", "));
    return NextResponse.json(
      {
        error:
          `Image upload is not configured on this deployment. Missing or blank: ${missing.join(", ")}. ` +
          "Set them in the environment and redeploy — Vercel only applies new variables to " +
          "deployments created after they were added. You can paste an image URL in the meantime.",
        missing,
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
