import Link from "next/link";

export default function CustomBanner({
  title,
  subtitle,
  image,
  buttonText,
  buttonUrl,
  textAlign = "left",
  backgroundColor,
}: {
  title?: string;
  subtitle?: string;
  image?: string;
  buttonText?: string;
  buttonUrl?: string;
  textAlign?: "left" | "center" | "right";
  backgroundColor?: string;
}) {
  if (!title && !subtitle && !image) return null;

  const alignClasses = textAlign === "center" ? "items-center text-center" : textAlign === "right" ? "items-end text-right" : "items-start text-left";

  return (
    <section className="container-px mx-auto section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="relative rounded-xl2 overflow-hidden">
        {image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-ink/45" />
          </>
        )}
        <div className={`relative flex flex-col ${alignClasses} gap-4 px-8 py-16 md:py-20 ${image ? "text-white" : "bg-beige/60 text-ink"}`}>
          {title && <h2 className="font-display text-3xl md:text-4xl font-semibold max-w-xl">{title}</h2>}
          {subtitle && <p className={`max-w-md leading-relaxed ${image ? "text-white/75" : "text-ink/70"}`}>{subtitle}</p>}
          {buttonText && (
            <Link href={buttonUrl || "/shop"} className="btn-primary mt-2">
              {buttonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
