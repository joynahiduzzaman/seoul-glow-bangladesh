"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2, Crop } from "lucide-react";
import toast from "react-hot-toast";
import ImageCropModal from "./homepage/ImageCropModal";
import { compressImage } from "@/lib/admin/image-compression";

/** Single-image variant of ImageUploadField — reuses the same /api/admin/upload
 * endpoint, just for one image at a time (Hero desktop/mobile images) instead of
 * a reorderable gallery. `aspect` (width/height) sizes both the preview box and
 * the crop tool's viewport — pass a narrower ratio for mobile hero images. */
export default function SingleImageUpload({
  label,
  value,
  onChange,
  aspect = 16 / 7,
  maxDimension,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: number;
  /** Longest-side cap handed to the compressor. Defaults to the shared 1920px,
   * but full-bleed art (the hero banner) must pass something larger — a 1920px
   * source stretched edge-to-edge on a wide or retina screen is upscaled, which
   * is exactly what makes a hero read as soft/blurry. */
  maxDimension?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadBlob(blob: Blob, filename: string) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, filename);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onChange(data.url);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    const compressed = await compressImage(file, maxDimension ? { maxDimension } : {});
    await uploadBlob(compressed, compressed.name);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      <label className="block text-xs font-medium text-ink/70 mb-2">{label}</label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden ring-1 ring-ink/10 bg-beige/40 mb-2" style={{ aspectRatio: aspect }}>
          <Image src={value} alt={label} fill sizes="400px" className="object-cover" />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setCropping(true)}
              aria-label={`Crop ${label}`}
              className="h-6 w-6 rounded-full bg-ink/80 text-white flex items-center justify-center hover:bg-ink"
            >
              <Crop size={12} />
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label={`Remove ${label}`}
              className="h-6 w-6 rounded-full bg-ink/80 text-white flex items-center justify-center hover:bg-ink"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-ink/15 flex flex-col items-center justify-center gap-2 text-ink/70 hover:border-rose-gold hover:text-rose-gold transition-colors mb-2"
          style={{ aspectRatio: aspect }}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          <span className="text-xs">{uploading ? "Uploading…" : "Upload image"}</span>
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleFile(e.target.files)} />

      {cropping && value && (
        <ImageCropModal
          src={value}
          aspect={aspect}
          onCancel={() => setCropping(false)}
          onApply={(blob) => {
            setCropping(false);
            uploadBlob(blob, "cropped.jpg");
          }}
        />
      )}
    </div>
  );
}
