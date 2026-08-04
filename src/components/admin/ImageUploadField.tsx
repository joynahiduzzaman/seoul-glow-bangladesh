"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2, Link2, GripVertical } from "lucide-react";
import toast from "react-hot-toast";
import { compressImage } from "@/lib/admin/image-compression";

export default function ImageUploadField({
  images,
  onChange,
  label = "Product Images",
}: {
  images: string[];
  onChange: (images: string[]) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const rawFile of Array.from(files)) {
        const file = await compressImage(rawFile);
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || `Failed to upload ${file.name}`);
          continue;
        }
        uploaded.push(data.url);
      }
      if (uploaded.length) onChange([...images, ...uploaded]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    onChange([...images, url]);
    setUrlInput("");
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function moveTo(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function handleDrop(dropIndex: number) {
    if (dragIndex !== null && dragIndex !== dropIndex) moveTo(dragIndex, dropIndex);
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div>
      <label className="block text-xs font-medium text-ink/70 mb-2">{label}</label>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-3">
          {images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
              onDragLeave={() => setOverIndex((cur) => (cur === i ? null : cur))}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              className={`relative group aspect-square rounded-lg overflow-hidden ring-1 bg-beige/40 cursor-grab active:cursor-grabbing transition-all ${
                overIndex === i && dragIndex !== null && dragIndex !== i ? "ring-2 ring-rose-gold scale-[1.03]" : "ring-ink/10"
              } ${dragIndex === i ? "opacity-40" : ""}`}
            >
              <Image src={src} alt={`Product image ${i + 1}`} fill sizes="120px" className="object-cover pointer-events-none" />
              {i === 0 && (
                <span className="absolute top-1 left-1 rounded-full bg-ink/80 text-white text-[9px] px-2 py-0.5">Cover</span>
              )}
              <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-ink/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={11} />
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove image"
                className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-ink/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={11} />
              </button>
              {images.length > 1 && (
                <div className="absolute bottom-1 left-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => moveTo(i, i - 1)} disabled={i === 0} aria-label="Move left" className="h-5 w-5 rounded bg-ink/80 text-white text-[10px] disabled:opacity-30 flex items-center justify-center">
                    ←
                  </button>
                  <button type="button" onClick={() => moveTo(i, i + 1)} disabled={i === images.length - 1} aria-label="Move right" className="h-5 w-5 rounded bg-ink/80 text-white text-[10px] disabled:opacity-30 flex items-center justify-center">
                    →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-ink/10 px-3.5 py-2 hover:border-rose-gold hover:text-rose-gold-text transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? "Uploading…" : "Upload from device"}
        </button>

        <span className="text-xs text-ink/30">or</span>

        <div className="flex items-center gap-1.5">
          <Link2 size={13} className="text-ink/30" />
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
            placeholder="Paste an image URL"
            className="text-xs rounded-lg border border-ink/10 px-3 py-2 w-48"
          />
          <button type="button" onClick={addUrl} className="text-xs rounded-lg border border-ink/10 px-3 py-2 hover:border-rose-gold hover:text-rose-gold-text transition-colors">
            Add
          </button>
        </div>
      </div>
      <p className="text-[11px] text-ink/35 mt-2">JPG, PNG, WEBP, or GIF · up to 4MB each · drag to reorder · first image is used as the cover photo.</p>
    </div>
  );
}
