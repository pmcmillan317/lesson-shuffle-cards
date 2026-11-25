/* Lesson Shuffle card site: anonymous counts. No dependencies, sets no cookies, no storage.
   Sends small counts to https://lessonshuffle.com/api/track (see the stats page there). Only these are ever sent:
   the label, the page path, and for a campaign link the utm source, medium and campaign. Nothing about the visitor.
   Counted: links marked data-track, email links, downloads, printable and tool links, links to other sites,
   a printable being printed, and arrivals from a link with utm_source or utm_campaign.
   It never blocks or delays a link. Every page works without it. */
(function () {
  "use strict";
  // A browser signed in to the stats page on lessonshuffle.com carries the cookie "ls_me=1" (set there for all
  // three sites). That browser is Patrick's own, so it is never counted: no page view, no click counts.
  if (/(^|;\s*)ls_me=1(;|$)/.test(document.cookie)) return;

  // Page views and visits: Cloudflare Web Analytics (cookieless). Cloudflare does not add it to this site
  // by itself, so it is loaded here, with the site token of the lessonshuffle.com Web Analytics site.
  try {
    var cf = document.createElement("script");
    cf.defer = true;
    cf.src = "https://static.cloudflareinsights.com/beacon.min.js";
    cf.setAttribute("data-cf-beacon", '{"token": "62954193f2df41488aee0b697433e7d7"}');
    document.head.appendChild(cf);
  } catch (err) { /* counting is optional */ }

  if (!navigator.sendBeacon) return;
  var URL_TRACK = "https://lessonshuffle.com/api/track";
  var OWN = ["lessonshuffle.com", "www.lessonshuffle.com", "apps.lessonshuffle.com", "cards.lessonshuffle.com"];

  function send(body) {
    try {
      navigator.sendBeacon(URL_TRACK, new Blob([JSON.stringify(body)], { type: "text/plain" }));
    } catch (err) { /* counting is optional */ }
  }
  function clean(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9:._\/-]/g, "-").replace(/^[^a-z0-9]+/, "").slice(0, 80);
  }
  function count(label) {
    label = clean(label);
    if (label) send({ e: label, p: location.pathname });
  }
  function slugOf(path, folder) {
    var m = path.match(new RegExp("^/" + folder + "/([^/]+?)(?:\\.html)?/?$"));
    return m ? m[1] : "";
  }

  function labelFor(link) {
    var tag = link.getAttribute("data-track");
    if (tag) return tag;
    var href = link.getAttribute("href") || "";
    if (/^mailto:/i.test(href)) return "email";
    var url;
    try { url = new URL(link.href, location.href); } catch (err) { return ""; }
    var path = url.pathname;
    var file = "";
    try { file = decodeURIComponent(path.split("/").pop() || ""); } catch (err) { file = path.split("/").pop() || ""; }
    if (/^https?:$/.test(url.protocol) || link.hasAttribute("download")) {
      if (link.hasAttribute("download") || /\.(pdf|png|jpg|zip|docx|pptx)$/i.test(path)) {
        return "download:" + (file || "file");
      }
    }
    if (!/^https?:$/.test(url.protocol)) return "";
    var same = url.hostname === location.hostname;
    var own = same || OWN.indexOf(url.hostname) !== -1;
    if (same) {
      var printable = slugOf(path, "print");
      if (printable) return "printable:" + printable;
      var tool = slugOf(path, "tools");
      if (tool) return "tool:" + tool;
    }
    if (!own) return "out:" + url.hostname;
    return "";
  }

  function onClick(event) {
    try {
      var node = event.target;
      var link = node && node.closest ? node.closest("a") : null;
      if (!link) return;
      var label = labelFor(link);
      if (label) count(label);
    } catch (err) { /* counting is optional */ }
  }
  document.addEventListener("click", onClick);
  document.addEventListener("auxclick", onClick);

  /* Arrival from a campaign link (utm_source or utm_campaign in the address). */
  try {
    var q = new URLSearchParams(location.search);
    function val(k) { return (q.get(k) || "").trim().toLowerCase().slice(0, 60); }
    var s = val("utm_source"), m = val("utm_medium"), c = val("utm_campaign");
    if (s || c) {
      var u = {};
      if (s) u.s = s;
      if (m) u.m = m;
      if (c) u.c = c;
      send({ e: "campaign", p: location.pathname, u: u });
    }
  } catch (err) { /* counting is optional */ }

  /* A printable being printed, once per page load. */
  var printed = slugOf(location.pathname, "print");
  if (printed) {
    var done = false;
    window.addEventListener("beforeprint", function () {
      if (done) return;
      done = true;
      count("printed:" + printed);
    });
  }
})();
