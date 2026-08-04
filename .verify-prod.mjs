const B = "https://seoul-glow-bangladesh.vercel.app";
const jar = new Map();
const ch = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
async function req(p, o = {}) {
  const r = await fetch(B + p, { ...o, redirect: "manual", headers: { cookie: ch(), origin: B, ...(o.headers || {}) } });
  for (const c of r.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(";"); const i = kv.indexOf("=");
    jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
  }
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAKUlEQVR42mNkYPhfz0BsYGBg" +
  "YGRgYGBiYGBgZmBgYGFgYGBlYGBgAwCFEwH3xsCTBAAAAABJRU5ErkJggg==", "base64");

async function login() {
  jar.clear();
  const r = await req("/api/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "admin@seoulglow.com.bd", password: process.env.ADMIN_PW }),
  });
  return r.status === 200;
}

async function tryUpload() {
  const fd = new FormData();
  fd.append("file", new Blob([png], { type: "image/png" }), "verify.png");
  return req("/api/admin/upload", { method: "POST", body: fd });
}

// Poll until the deployment carrying the Cloudinary env snapshot is live.
console.log("  waiting for the new deployment…");
let up = null;
for (let attempt = 1; attempt <= 12; attempt++) {
  if (!(await login())) { await sleep(15000); continue; }
  up = await tryUpload();
  if (up.status === 201) { console.log(`  new deployment live (attempt ${attempt})`); break; }
  if (attempt === 12) break;
  await sleep(15000);
}

console.log("");
console.log("=== Cloudinary ===");
if (up?.status === 201) {
  const { url, publicId } = up.json;
  const isCloud = typeof url === "string" && url.includes("res.cloudinary.com");
  console.log(`  upload            HTTP 201`);
  console.log(`  cloudinary URL    ${isCloud ? "yes" : "NO — " + url}`);
  console.log(`  https             ${url?.startsWith("https://") ? "yes" : "NO"}`);
  console.log(`  folder            ${publicId ?? "(none)"}`);
  if (isCloud) {
    const img = await fetch(url);
    console.log(`  CDN fetch         HTTP ${img.status} ${img.headers.get("content-type")} ${img.headers.get("content-length")}B`);
  }
} else {
  console.log(`  upload            HTTP ${up?.status} — ${JSON.stringify(up?.json ?? up?.text?.slice(0, 200))}`);
}

console.log("");
console.log("=== Resend (password reset triggers a real send) ===");
const target = process.env.TEST_EMAIL;
const fp = await req("/api/auth/forgot-password", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: target }),
});
console.log(`  forgot-password   HTTP ${fp.status} ${JSON.stringify(fp.json ?? fp.text.slice(0, 120))}`);
console.log(`  (endpoint always returns success so it cannot be used to enumerate accounts —`);
console.log(`   whether delivery happened has to be confirmed in the Resend dashboard)`);
