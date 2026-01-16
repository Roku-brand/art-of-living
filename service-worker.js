const CACHE = "shoseijutsu-static-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./manifest.webmanifest",
  "./data/life.json",
  "./data/internal.json",
  "./data/relation.json",
  "./data/operation.json",
  "./data/execution.json",
  "./data/adapt.json",
  "./data/extra.json",
  "./data/situations.json",
  "./data/situation-tips.json",
  "./icons/icon.svg",
  "./icons/icon-maskable.svg",
  "./icons/favicon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
