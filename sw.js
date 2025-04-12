const CACHE_NAME = "geosputnik-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/app.js",
  "/manifest.json",
  "/favicon.ico",
  "https://js.arcgis.com/4.29/esri/themes/light/main.css",
  "https://js.arcgis.com/4.29/",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});