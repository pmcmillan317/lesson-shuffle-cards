# Lesson Shuffle card site

The pages behind every card's QR code at https://cards.lessonshuffle.com.

- Site files live in `public/` (plain HTML, CSS and JS; no build step).
- Hosted on the Cloudflare Pages project `lesson-shuffle-cards`, connected to this repo (build command: none; build output directory: `public`). The custom domain `cards.lessonshuffle.com` is a CNAME at Squarespace pointing to `lesson-shuffle-cards.pages.dev`.
- Every push to `main` redeploys automatically.
- `wrangler.jsonc` is only used by the older Worker copy of the site, which can be deleted.
- Card URLs must keep their current slugs (e.g. `/concept-clash`), because they are printed in the QR codes.

## The home page (card browser and shuffle)

The home page shows the cards as a fanned hand you flip through (with a Grid view for scanning), and the Shuffle button deals a random card from whatever the search and filters currently show, with an animated deck of card backs.

- The card list is the JSON in `<script id="deck-data">` in `public/index.html`. Everything between `<!-- deck:start -->` and `<!-- deck:end -->` is generated from it, so do not edit that block by hand.
- To add, remove or reword a card: edit the JSON, put the card face at `public/cards/<slug>.webp`, then run:
  - `node tools/make-thumbs.cjs` (small faces for the home page go in `public/cards/t/`)
  - `node tools/build-index.cjs` (rebuilds the page; it also reads each card page for the time label)
  - `py tools/printables/build_sw.py` (offline file list)
- The card back is `public/brand/card-back.svg`. The shuffle and fan code is in `public/site.js` (search for "the shuffle table" and "The fanned hand"); styles are the last block of `public/style.css`.

## Counting

`public/track.js` (loaded by every page, including the printables) sends anonymous counts to `https://lessonshuffle.com/api/track`. The numbers show on the private stats page at lessonshuffle.com/stats/. It counts: links marked `data-track="label"`, email links (`email`), downloads (`download:<file>`), printable links (`printable:<slug>`), links to other sites (`out:<site>`), a printable being printed (`printed:<slug>`), and visits that arrive from a link with `utm_source` or `utm_campaign` (a campaign count with the source, medium and campaign). It sends only the label and the page path, never anything about the visitor, and it uses no cookies or storage. It also loads the Cloudflare Web Analytics counter for page views (Cloudflare does not add it to this site by itself; the token is the lessonshuffle.com Web Analytics site's). A browser signed in to the stats page carries the `ls_me=1` cookie from lessonshuffle.com and is never counted. When `track.js` changes, bump `?v=` in every page, `tools/printables/printables.py` and `build_sw.py`, then run `build_sw.py`. New links are counted automatically, so there is nothing to add by hand. Keep `/track.js` in the offline list (`tools/printables/build_sw.py` already does).
