"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Upload, Trash2, Loader2, ImagePlus, AlertCircle } from "lucide-react";
import { compressImage } from "@/lib/admin/image-compression";

/**
 * Square image field for a category image or brand logo.
 *
 * Built because the previous editor had no image control in edit mode at all —
 * the thumbnail was displayed but there was no way to replace it, which is why
 * images appeared unchangeable.
 *
 * The whole tile is the drop target and the click target, so there is no
 * separate "browse" affordance to hunt for. A local preview appears the instant
 * a file is chosen, before the upload finishes, so the choice is confirmed
 * visually rather than after a wait.
 */
export default function TaxonomyImageField({
  value,
  onChange,
  label,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Shown while the real upload is in flight, so the tile never looks empty
  // after a file has been picked.
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const shown = localPreview || value;

  async function handleFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("That file is not an image");
      toast.error("Choose a JPG, PNG, WEBP or GIF");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setUploading(true);

    try {
      // Compressed client-side first: the upload route caps bodies at 4MB to
      // stay under Vercel's edge limit, and a phone photo routinely exceeds it.
      const compressed = await compressImage(file);
      const body = new FormData();
      body.append("file", compressed, file.name);

      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");

      onChange(data.url);
      toast.success("Image uploaded");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      toast.error(message);
      // Drop the preview so the tile does not imply an image that was never saved.
      setLocalPreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
      // Reset so re-selecting the same file still fires a change event.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <p className="field-label">{label}</p>

      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`relative aspect-square w-full max-w-[240px] overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          dragging ? "border-rose-gold bg-rose-gold/5" : error ? "border-red-300 bg-red-50/40" : "border-ink/15 bg-beige/40"
        }`}
      >
        {shown ? (
          <>
            <Image src={shown} alt="" fill sizes="240px" className="object-cover" unoptimized={Boolean(localPreview)} />
            {/* Tapping the tile is the same as pressing Replace. Phones have no
                hover, so the buttons below are the real controls — this is just
                the shortcut a pointer user expects from a picture. */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              aria-label={`Replace ${label.toLowerCase()}`}
              className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all hover:bg-ink/40 hover:opacity-100 focus-visible:bg-ink/40 focus-visible:opacity-100"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-ink shadow-e2">
                <Upload size={13} aria-hidden="true" /> Replace
              </span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center transition-colors hover:bg-beige/70"
          >
            <ImagePlus size={26} className="text-ink/30" aria-hidden="true" />
            <span className="text-xs font-medium text-ink/70">Click or drop an image</span>
            <span className="text-[11px] text-ink/40">JPG, PNG, WEBP · square works best</span>
          </button>
        )}

        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/75 backdrop-blur-sm">
            <Loader2 size={22} className="animate-spin text-rose-gold-text" />
            <span className="text-xs font-medium text-ink/70">Uploading…</span>
          </div>
        )}
      </div>

      {/* Always visible, never hover-dependent: a phone has no hover, and an
          image that cannot be changed on a phone is the bug this field exists
          to fix. Both are comfortably above the 24px minimum touch target. */}
      {shown && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-ink/15 px-3.5 text-xs font-semibold text-ink transition-colors hover:bg-beige disabled:opacity-50"
          >
            <Upload size={13} aria-hidden="true" /> Replace image
          </button>
          <button
            type="button"
            onClick={() => { onChange(""); setLocalPreview(null); setError(null); toast.success("Image removed"); }}
            disabled={disabled || uploading}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-200 px-3.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={13} aria-hidden="true" /> Remove
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-red-600">
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
