# Lesson Shuffle card site

The pages behind every card's QR code at https://cards.lessonshuffle.com.

- Site files live in `public/` (plain HTML, CSS and JS; no build step).
- `wrangler.jsonc` tells Cloudflare to serve `public/` as static assets.
- Every push to `main` redeploys automatically.
- Card URLs must keep their current slugs (e.g. `/concept-clash`), because they are printed in the QR codes.
