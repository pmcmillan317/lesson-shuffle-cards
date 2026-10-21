# Lesson Shuffle card site

The pages behind every card's QR code at https://cards.lessonshuffle.com.

- Site files live in `public/` (plain HTML, CSS and JS; no build step).
- Hosted on the Cloudflare Pages project `lesson-shuffle-cards`, connected to this repo (build command: none; build output directory: `public`). The custom domain `cards.lessonshuffle.com` is a CNAME at Squarespace pointing to `lesson-shuffle-cards.pages.dev`.
- Every push to `main` redeploys automatically.
- `wrangler.jsonc` is only used by the older Worker copy of the site, which can be deleted.
- Card URLs must keep their current slugs (e.g. `/concept-clash`), because they are printed in the QR codes.
