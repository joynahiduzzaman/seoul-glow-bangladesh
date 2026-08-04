import Image from "next/image";

export default function RootLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-32">
      <div className="relative h-14 w-14">
        <Image src="/logo.png" alt="Seoul Glow Bangladesh" fill sizes="56px" className="rounded-full animate-pulse" />
        <div className="absolute -inset-1.5 rounded-full border-2 border-rose-gold border-t-transparent animate-spin" />
      </div>
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/70">Loading</span>
    </div>
  );
}
