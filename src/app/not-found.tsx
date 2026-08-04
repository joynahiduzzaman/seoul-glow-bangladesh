import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="container-px mx-auto py-24 text-center flex flex-col items-center">
      <Image src="/logo.png" alt="Seoul Glow Bangladesh" width={72} height={72} className="rounded-full mb-6" />
      <h1 className="font-display text-4xl font-semibold mb-3">Page Not Found</h1>
      <p className="text-ink/70 max-w-sm mb-8">
        The page you're looking for doesn't exist or may have moved. Let's get you back to the good stuff.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link href="/" className="btn-primary">Back to Home</Link>
        <Link href="/shop" className="btn-outline">Shop All Products</Link>
      </div>
    </div>
  );
}
