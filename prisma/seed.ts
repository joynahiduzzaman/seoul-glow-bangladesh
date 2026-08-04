import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import slugify from "slugify";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

/** [label, email, password] for accounts whose password this run generated. */
const generatedCredentials: Array<[string, string, string]> = [];

const categories = [
  { name: "Cleanser", slug: "cleanser" },
  { name: "Toner", slug: "toner" },
  { name: "Essence", slug: "essence" },
  { name: "Serum", slug: "serum" },
  { name: "Ampoule", slug: "ampoule" },
  { name: "Moisturizer", slug: "moisturizer" },
  { name: "Sunscreen", slug: "sunscreen" },
  { name: "Lip Care", slug: "lip-care" },
  { name: "Eye Care", slug: "eye-care" },
  { name: "Masks", slug: "masks" },
  { name: "Hair Care", slug: "hair-care" },
  { name: "Body Care", slug: "body-care" },
  { name: "Makeup", slug: "makeup" },
  { name: "Tools", slug: "tools" },
  { name: "Travel Kits", slug: "travel-kits" },
  { name: "Gift Sets", slug: "gift-sets" },
];

const brands = [
  { name: "COSRX", slug: "cosrx", story: "Cosmetics + RX. Simple, effective formulas born from dermatology research in Seoul." },
  { name: "Beauty of Joseon", slug: "beauty-of-joseon", story: "Modern skincare inspired by traditional Korean hanbang ingredients like rice and ginseng." },
  { name: "Anua", slug: "anua", story: "Gentle, ingredient-focused formulas centered on heartleaf and calming skincare." },
  { name: "SKIN1004", slug: "skin1004", story: "Madagascar Centella-powered skincare, clean and dermatologist-tested." },
  { name: "Round Lab", slug: "round-lab", story: "Skincare inspired by Korea's natural landscapes — mountains, sea, and soil." },
  { name: "Isntree", slug: "isntree", story: "Honest, hypoallergenic formulas that let the ingredients speak for themselves." },
  { name: "Torriden", slug: "torriden", story: "Deep hydration skincare built around low molecular hyaluronic acid." },
  { name: "Medicube", slug: "medicube", story: "Dermatology-clinic-grade skincare and tools for visible results." },
  { name: "Dr.G", slug: "dr-g", story: "Dermatologist-founded brand focused on sensitive and troubled skin." },
  { name: "Etude", slug: "etude", story: "Playful, romantic Korean beauty and makeup for every mood." },
  { name: "Laneige", slug: "laneige", story: "Water-science skincare inspired by Korea's shifting seasons." },
  { name: "Innisfree", slug: "innisfree", story: "Nature-derived skincare sourced from Jeju Island." },
];

// Publicly hosted stock photography used for demo/seed purposes only — replace with your real product photography.
const img = (seed: string) => `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=800&q=80`;

const products = [
  { name: "Advanced Snail 96 Mucin Power Essence", brand: "cosrx", category: "essence", price: 1450, discount: 10, skinType: ["All"], concern: ["Hydration", "Repair"], featured: true, bestSeller: true, img: "photo-1620916566398-39f1143ab7be" },
  { name: "Low pH Good Morning Gel Cleanser", brand: "cosrx", category: "cleanser", price: 950, discount: 0, skinType: ["Oily", "Combination"], concern: ["Pore care"], bestSeller: true, img: "photo-1556228720-195a672e8a03" },
  { name: "Glow Deep Serum: Rice + Alpha Arbutin", brand: "beauty-of-joseon", category: "serum", price: 1650, discount: 15, skinType: ["All"], concern: ["Brightening"], featured: true, newArrival: true, img: "photo-1571781926291-c477ebfd024b" },
  { name: "Relief Sun: Rice + Probiotics SPF50+", brand: "beauty-of-joseon", category: "sunscreen", price: 1350, discount: 0, skinType: ["All"], concern: ["Sun protection"], bestSeller: true, trending: true, img: "photo-1556228453-efd6c1ff04f6" },
  { name: "Heartleaf 77% Soothing Toner", brand: "anua", category: "toner", price: 1250, discount: 20, skinType: ["Sensitive"], concern: ["Redness", "Calming"], flashSale: true, featured: true, img: "photo-1608571423902-eed4a5ad8108" },
  { name: "Heartleaf Pore Control Cleansing Oil", brand: "anua", category: "cleanser", price: 1550, discount: 0, skinType: ["Oily"], concern: ["Pore care"], newArrival: true, img: "photo-1519415943484-9fa1873496d4" },
  { name: "Centella Ampoule", brand: "skin1004", category: "ampoule", price: 1400, discount: 12, skinType: ["Sensitive", "All"], concern: ["Calming", "Repair"], bestSeller: true, trending: true, img: "photo-1598452963314-b09f397a5c48" },
  { name: "Madagascar Centella Tone Brightening Cream", brand: "skin1004", category: "moisturizer", price: 1750, discount: 0, skinType: ["All"], concern: ["Brightening"], img: "photo-1611930022073-b7a4ba5fcccd" },
  { name: "1025 Dokdo Toner", brand: "round-lab", category: "toner", price: 1300, discount: 0, skinType: ["All"], concern: ["Hydration"], newArrival: true, img: "photo-1585232351009-aa87416fca90" },
  { name: "Birch Juice Moisturizing Sun Cream", brand: "round-lab", category: "sunscreen", price: 1400, discount: 8, skinType: ["All"], concern: ["Sun protection"], trending: true, img: "photo-1556228578-8c89e6adf883" },
  { name: "Hyaluronic Acid Deep Dive Serum", brand: "torriden", category: "serum", price: 1600, discount: 0, skinType: ["Dry"], concern: ["Hydration"], bestSeller: true, img: "photo-1571781926291-c477ebfd024b" },
  { name: "Chio Cica Bomb Ampoule", brand: "medicube", category: "ampoule", price: 2100, discount: 10, skinType: ["Sensitive"], concern: ["Calming", "Repair"], featured: true, img: "photo-1580870069867-74c57ee1bb07" },
  { name: "Red Blemish Clear Soothing Cream", brand: "dr-g", category: "moisturizer", price: 1900, discount: 0, skinType: ["Acne-prone"], concern: ["Blemish", "Calming"], img: "photo-1601049676869-702ea24cfd58" },
  { name: "Soon Jung 2x Barrier Intensive Cream", brand: "isntree", category: "moisturizer", price: 1550, discount: 5, skinType: ["Sensitive"], concern: ["Barrier repair"], newArrival: true, img: "photo-1611930022073-b7a4ba5fcccd" },
  { name: "Soft Touch Tinted Lip Balm", brand: "etude", category: "lip-care", price: 650, discount: 0, skinType: ["All"], concern: ["Lip care"], img: "photo-1601049676869-702ea24cfd58" },
  { name: "Water Sleeping Mask", brand: "laneige", category: "masks", price: 2400, discount: 0, skinType: ["All"], concern: ["Hydration"], bestSeller: true, featured: true, img: "photo-1601049676869-702ea24cfd58" },
  { name: "Green Tea Seed Hyaluronic Serum", brand: "innisfree", category: "serum", price: 1500, discount: 18, skinType: ["Dry", "Normal"], concern: ["Hydration"], flashSale: true, img: "photo-1598452963314-b09f397a5c48" },
  { name: "Jeju Volcanic Pore Clay Mask", brand: "innisfree", category: "masks", price: 1150, discount: 0, skinType: ["Oily"], concern: ["Pore care"], trending: true, img: "photo-1608248543803-ba4f8c70ae0b" },
];

/**
 * This script is destructive — it clears orders, reviews and users before
 * inserting demo data. Against a live store that means deleting real customers'
 * order history, so production is refused outright. The escape hatch exists only
 * for a deliberate first-run bootstrap of an empty production database, and it
 * has to be asked for explicitly.
 */
/**
 * Resolves the admin credentials AND decides whether seeding may proceed.
 *
 * Every check here must happen before the first deleteMany() below. An earlier
 * version validated the admin credentials at the point of user creation, which
 * is after the deletes — so a production bootstrap with a missing
 * SEED_ADMIN_PASSWORD would wipe the database and only then fail. Validate
 * first, destroy second.
 */
function preflight(): { email: string; password: string; generated: boolean } {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (process.env.SEED_ALLOW_PRODUCTION !== "true") {
      throw new Error(
        "Refusing to seed: NODE_ENV=production.\n" +
          "This script deletes existing orders, reviews and users before inserting demo data.\n" +
          "If you really intend to bootstrap an empty production database, re-run with SEED_ALLOW_PRODUCTION=true."
      );
    }
    console.warn("⚠  SEED_ALLOW_PRODUCTION=true — seeding a PRODUCTION database. Existing orders will be deleted.");
  }

  const email = process.env.SEED_ADMIN_EMAIL || "admin@seoulglow.com.bd";
  const supplied = process.env.SEED_ADMIN_PASSWORD;

  if (supplied) return { email, password: supplied, generated: false };

  if (isProduction) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set when seeding in production.");
  }

  // Development: generate rather than hardcode, so no known-password admin can
  // ever exist just because someone ran the seed.
  return { email, password: randomBytes(18).toString("base64url"), generated: true };
}

async function main() {
  const admin = preflight();
  console.log("Seeding database…");

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.address.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.user.deleteMany();

  const categoryMap: Record<string, string> = {};
  for (const c of categories) {
    const created = await prisma.category.create({
      data: { ...c, image: img("photo-1556228720-195a672e8a03") },
    });
    categoryMap[c.slug] = created.id;
  }

  const brandMap: Record<string, string> = {};
  for (const b of brands) {
    const created = await prisma.brand.create({
      data: {
        name: b.name,
        slug: b.slug,
        story: b.story,
        banner: img("photo-1522337360788-8b13dee7a37e"),
      },
    });
    brandMap[b.slug] = created.id;
  }

  for (const p of products) {
    await prisma.product.create({
      data: {
        name: p.name,
        slug: slugify(p.name, { lower: true, strict: true }),
        brandId: brandMap[p.brand],
        categoryId: categoryMap[p.category],
        description: `${p.name} is a bestselling Korean skincare formula, imported directly from South Korea with full authenticity verification for Seoul Glow Bangladesh customers.`,
        ingredients: "Water, Glycerin, Butylene Glycol, Centella Asiatica Extract, Niacinamide, Panthenol (full INCI list on packaging).",
        howToUse: "Apply after cleansing and toning, morning and night. Follow with moisturizer and sunscreen (AM).",
        skinType: JSON.stringify(p.skinType),
        skinConcern: JSON.stringify(p.concern),
        benefits: JSON.stringify(["Hydrates", "Soothes", "Strengthens skin barrier"]),
        countryOfOrigin: "South Korea",
        batchNumber: `BN-${Math.floor(100000 + Math.random() * 900000)}`,
        authenticityCode: `SGB-AUTH-${Math.floor(10000 + Math.random() * 90000)}`,
        barcode: `880${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        images: JSON.stringify([img(p.img), img(p.img)]),
        // Demo 360° frames on the first couple of products only, to show the viewer working.
        // Real 360° product photography needs ~24-36 frames shot at even angle intervals;
        // these reuse a couple of stock photos purely to demonstrate the drag-to-rotate mechanism.
        images360: JSON.stringify(
          products.indexOf(p) < 2
            ? [img(p.img), img("photo-1522337360788-8b13dee7a37e"), img(p.img), img("photo-1571781926291-c477ebfd024b")]
            : []
        ),
        price: p.price,
        discountPercent: p.discount || 0,
        stock: Math.floor(20 + Math.random() * 100),
        weightGrams: 100,
        volumeMl: 100,
        isFeatured: !!p.featured,
        isBestSeller: !!p.bestSeller,
        isNewArrival: !!p.newArrival,
        isFlashSale: !!p.flashSale,
        isTrending: !!p.trending,
      },
    });
  }

  // Give each brand its own banner instead of the one shared placeholder image
  // above — a real shot of one of that brand's own products, so a Laneige page
  // doesn't look identical to a COSRX page. Brands must exist before products,
  // so this has to run as a pass after both are seeded.
  for (const slug of Object.keys(brandMap)) {
    const firstProduct = await prisma.product.findFirst({
      where: { brandId: brandMap[slug], images: { not: "[]" } },
      orderBy: [{ isBestSeller: "desc" }, { createdAt: "desc" }],
      select: { images: true },
    });
    if (firstProduct) {
      const [firstImage] = JSON.parse(firstProduct.images) as string[];
      if (firstImage) {
        await prisma.brand.update({ where: { id: brandMap[slug] }, data: { banner: firstImage } });
      }
    }
  }

  // Credentials were resolved and validated in preflight(), before the deletes.
  if (admin.generated) generatedCredentials.push(["Admin", admin.email, admin.password]);

  await prisma.user.create({
    data: {
      name: "Store Admin",
      email: admin.email,
      password: await bcrypt.hash(admin.password, 10),
      role: "ADMIN",
      emailVerified: true,
      referralCode: "ADMINGLOW",
    },
  });

  const customerPlain = randomBytes(12).toString("base64url");
  generatedCredentials.push(["Customer", "customer@example.com", customerPlain]);
  const customerPassword = await bcrypt.hash(customerPlain, 10);
  const customer = await prisma.user.create({
    data: {
      name: "Test Customer",
      email: "customer@example.com",
      password: customerPassword,
      role: "CUSTOMER",
      emailVerified: true,
      referralCode: "GLOWTEST1",
    },
  });

  // Sample address, notifications, and a support ticket so the account dashboard's new
  // sections (Saved Addresses, Notifications, Support Tickets) show real demo data
  // immediately rather than every reviewer landing on an empty state.
  await prisma.address.create({
    data: {
      userId: customer.id,
      label: "Home",
      fullName: "Test Customer",
      phone: "01700000000",
      district: "Dhaka",
      area: "Gulshan",
      street: "House 12, Road 5",
      isInsideDhaka: true,
      isDefault: true,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: customer.id,
        type: "WELCOME",
        title: "Welcome to Seoul Glow Bangladesh",
        message: "Thanks for creating an account — explore our full Korean skincare collection.",
        link: "/shop",
      },
      {
        userId: customer.id,
        type: "GENERAL",
        title: "New arrivals this week",
        message: "Fresh drops from Beauty of Joseon and Anua just landed.",
        link: "/shop?filter=new",
        read: true,
      },
    ],
  });

  await prisma.supportTicket.create({
    data: {
      userId: customer.id,
      subject: "Question about product authenticity",
      status: "RESOLVED",
      replies: {
        create: [
          {
            message: "Hi, how can I verify my Beauty of Joseon serum is authentic? I don't see a code on the box.",
            isFromStaff: false,
            authorName: customer.name,
          },
          {
            message: "Hi! The authenticity code is on the inner box flap, not the outer sleeve — you'll find it printed next to the batch number. Let us know if you still can't locate it!",
            isFromStaff: true,
            authorName: "Seoul Glow Support",
          },
        ],
      },
    },
  });

  // Deliberately no seeded product reviews here — the homepage testimonials
  // section and product review lists only render real customer reviews
  // (TestimonialsSection returns null when empty), and fabricated reviewer
  // names/comments would show up as real content to actual site visitors.

  await prisma.coupon.create({
    data: {
      code: "GLOW10",
      type: "PERCENT",
      value: 10,
      minSpend: 1000,
      active: true,
    },
  });

  console.log("Seed complete.");
  if (generatedCredentials.length > 0) {
    console.log("\nGenerated credentials — shown once, not stored anywhere. Save them now:");
    for (const [label, email, password] of generatedCredentials) {
      console.log(`  ${label.padEnd(9)} ${email}  ${password}`);
    }
    console.log("Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD to choose these yourself.\n");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
