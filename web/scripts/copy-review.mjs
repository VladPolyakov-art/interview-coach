// Copies the built review page to docs/artifacts/11-design-review.html and fails on external hosts outside the allowed CDNs.
import { copyFileSync, readFileSync, statSync } from "node:fs";
const src = "dist-review/review.html";
const dst = "../../docs/artifacts/11-design-review.html";
const html = readFileSync(src, "utf8");
const ALLOWED = /^(https?:)?\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
const refs = [...html.matchAll(/(?:src|href)\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/g)].map((m) => m[1]).filter((u) => !ALLOWED.test(u));
if (refs.length) { console.error("✗ external resources:", refs); process.exit(1); }
copyFileSync(src, dst);
console.log(`✓ ${dst} · ${(statSync(dst).size / 1024).toFixed(0)} KB · no external resources`);
