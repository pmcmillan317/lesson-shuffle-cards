// Makes the small card faces used by the home page: public/cards/<slug>.webp -> public/cards/t/<slug>.webp (440 px wide).
// Run after adding or changing a card face:  node tools/make-thumbs.cjs
// Needs the "sharp" package; it falls back to the copy installed in the main site's folder.
const fs = require("fs"), path = require("path");
let sharp;
try { sharp = require("sharp"); } catch (e) { sharp = require(path.join(__dirname, "..", "..", "lesson-shuffle-site", "node_modules", "sharp")); }
const src = path.join(__dirname, "..", "public", "cards"), out = path.join(src, "t");
fs.mkdirSync(out, { recursive: true });
(async () => {
  let n = 0, bytes = 0;
  for (const f of fs.readdirSync(src).filter((x) => x.endsWith(".webp"))) {
    const buf = await sharp(path.join(src, f)).resize({ width: 440, withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90, effort: 5 }).toBuffer();
    fs.writeFileSync(path.join(out, f), buf); n++; bytes += buf.length;
  }
  console.log(n, "thumbnails,", Math.round(bytes / 1024), "KB");
})();
