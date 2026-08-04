"use client";

export interface CompressOptions {
  maxDimension?: number; // px, longest side — only ever downscales, never upscales
  quality?: number; // 0-1, applied to jpeg/webp output (canvas ignores it for png)
}

/**
 * Downscales + re-encodes an uploaded image client-side before it hits the
 * network — cuts upload time and storage for the common case of a phone photo
 * or unoptimized stock image far larger than anything the site actually
 * displays. Falls back to the original file whenever compression can't help
 * (GIFs, decode failures, or a "compressed" result that's actually bigger) —
 * never blocks an upload just because compression didn't pan out.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const maxDimension = opts.maxDimension ?? 1920;
  const quality = opts.quality ?? 0.82;

  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const targetW = Math.round(bitmap.width * scale);
    const targetH = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outType, quality));
    if (!blob || blob.size >= file.size) return file;

    const ext = outType === "image/png" ? "png" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, "") + `.${ext}`;
    return new File([blob], name, { type: outType });
  } catch {
    return file;
  }
}
