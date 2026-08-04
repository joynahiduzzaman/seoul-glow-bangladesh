"use client";

import { useState } from "react";
import ProductGallery from "./ProductGallery";
import Product360Viewer from "./Product360Viewer";
import { useLocale } from "@/lib/i18n/use-locale";

export default function ProductMediaTabs({
  images,
  images360,
  name,
}: {
  images: string[];
  images360: string[];
  name: string;
}) {
  const { dict } = useLocale();
  const has360 = images360.length > 0;
  const [tab, setTab] = useState<"photos" | "360">("photos");

  if (!has360) return <ProductGallery images={images} name={name} />;

  return (
    <div>
      <div className="inline-flex gap-1 mb-4 rounded-full bg-beige p-1">
        <button
          onClick={() => setTab("photos")}
          className={`text-xs rounded-full px-4 py-1.5 font-semibold transition-all duration-300 ${
            tab === "photos" ? "bg-white text-ink shadow-e1" : "text-ink/70 hover:text-ink"
          }`}
        >
          {dict.product.viewPhotos}
        </button>
        <button
          onClick={() => setTab("360")}
          className={`text-xs rounded-full px-4 py-1.5 font-semibold transition-all duration-300 ${
            tab === "360" ? "bg-white text-ink shadow-e1" : "text-ink/70 hover:text-ink"
          }`}
        >
          {dict.product.view360}
        </button>
      </div>
      {tab === "photos" ? <ProductGallery images={images} name={name} /> : <Product360Viewer frames={images360} name={name} />}
    </div>
  );
}
