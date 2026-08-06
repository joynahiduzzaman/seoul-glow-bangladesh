"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { Plus, Trash2, ArrowUp, ArrowDown, ExternalLink, Eye, EyeOff, Loader2, Instagram } from "lucide-react";
import SingleImageUpload from "./SingleImageUpload";

export interface AdminInstagramPost {
  id: string;
  imageUrl: string;
  postUrl: string;
  caption: string | null;
  displayOrder: number;
  enabled: boolean;
}

/**
 * Curated Instagram feed manager.
 *
 * Order is the whole point of this screen — the homepage shows the first four —
 * so reordering writes immediately rather than sitting behind a save button that
 * someone will forget. Each mutation calls router.refresh() so the list always
 * reflects the database rather than optimistic local state that could drift.
 */
export default function InstagramFeedManager({ posts }: { posts: AdminInstagramPost[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ imageUrl: "", postUrl: "", caption: "" });

  async function call(url: string, init: RequestInit, okMessage?: string) {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    if (okMessage) toast.success(okMessage);
    router.refresh();
    return data;
  }

  async function handleAdd() {
    if (!draft.imageUrl) return toast.error("Upload a thumbnail first");
    if (!draft.postUrl) return toast.error("Paste the Instagram post URL");
    setBusy("add");
    try {
      await call("/api/admin/instagram", { method: "POST", body: JSON.stringify(draft) }, "Post added");
      setDraft({ imageUrl: "", postUrl: "", caption: "" });
      setAdding(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, message?: string) {
    setBusy(id);
    try {
      await call(`/api/admin/instagram/${id}`, { method: "PATCH", body: JSON.stringify(body) }, message);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      await call(`/api/admin/instagram/${id}`, { method: "DELETE" }, "Post removed");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...posts];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(posts[index].id);
    try {
      await call("/api/admin/instagram/reorder", { method: "POST", body: JSON.stringify({ ids: next.map((p) => p.id) }) });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const liveCount = posts.filter((p) => p.enabled).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Instagram Feed</h1>
          <p className="mt-1 text-sm text-ink/70">
            The homepage shows the first <strong>4 visible</strong> posts, in this order.
            {liveCount > 0 && ` ${liveCount} visible right now.`}
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus size={16} /> Add post
          </button>
        )}
      </div>

      {adding && (
        <div className="card-surface mb-8 p-6">
          <h2 className="mb-4 font-display text-lg">New post</h2>
          <div className="grid gap-5 md:grid-cols-[220px_1fr]">
            <SingleImageUpload
              label="Thumbnail"
              value={draft.imageUrl}
              onChange={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
              aspect={1}
            />
            <div className="space-y-4">
              <div>
                <label className="field-label" htmlFor="ig-url">Instagram post URL</label>
                <input
                  id="ig-url"
                  placeholder="https://www.instagram.com/p/ABC123/"
                  value={draft.postUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, postUrl: e.target.value }))}
                  className="field"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="ig-caption">Caption (optional)</label>
                <input
                  id="ig-caption"
                  placeholder="Used as the image's description for screen readers"
                  value={draft.caption}
                  onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))}
                  className="field"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={busy === "add"} className="btn-primary">
                  {busy === "add" && <Loader2 size={15} className="animate-spin" />} Save post
                </button>
                <button onClick={() => { setAdding(false); setDraft({ imageUrl: "", postUrl: "", caption: "" }); }} className="btn-outline">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="card-surface px-6 py-16 text-center">
          <Instagram size={28} className="mx-auto mb-3 text-rose-gold-text" aria-hidden="true" />
          <p className="font-medium">No posts yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink/70">
            Until you add one, the homepage shows a “Follow @seoulglowbangladesh” link instead of the grid.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post, index) => (
            <li
              key={post.id}
              className={`card-surface flex flex-wrap items-center gap-4 p-4 ${post.enabled ? "" : "opacity-60"}`}
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-beige">
                {post.imageUrl ? (
                  <Image src={post.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {/* The first four are what customers actually see. */}
                  {post.enabled && index < 4 && (
                    <span className="rounded-full bg-badge-new-text/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-badge-new-text">
                      On homepage
                    </span>
                  )}
                  {!post.enabled && (
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/60">
                      Hidden
                    </span>
                  )}
                </div>
                <a
                  href={post.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-tap mt-1 inline-flex items-center gap-1.5 text-sm text-rose-gold-text hover:underline"
                >
                  <span className="truncate">{post.postUrl.replace(/^https:\/\/(www\.)?instagram\.com\//, "")}</span>
                  <ExternalLink size={12} className="shrink-0" aria-hidden="true" />
                </a>
                {post.caption && <p className="mt-0.5 truncate text-xs text-ink/60">{post.caption}</p>}
              </div>

              <div className="flex items-center gap-1.5">
                <IconButton label="Move up" onClick={() => move(index, -1)} disabled={index === 0 || busy === post.id}>
                  <ArrowUp size={15} />
                </IconButton>
                <IconButton label="Move down" onClick={() => move(index, 1)} disabled={index === posts.length - 1 || busy === post.id}>
                  <ArrowDown size={15} />
                </IconButton>
                <IconButton
                  label={post.enabled ? "Hide from homepage" : "Show on homepage"}
                  onClick={() => patch(post.id, { enabled: !post.enabled }, post.enabled ? "Hidden" : "Now visible")}
                  disabled={busy === post.id}
                >
                  {post.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
                </IconButton>
                <IconButton label="Delete post" onClick={() => remove(post.id)} disabled={busy === post.id} danger>
                  {busy === post.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? "text-red-600 hover:bg-red-50" : "text-ink/60 hover:bg-beige hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
