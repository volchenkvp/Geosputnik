const CACHE_NAME = "geosputnik-cache-v2"; // Изменил версию для сброса кэша
const urlsToCache = [
  "/",
  "/index.html",
  "/app.js",
  "/manifest.json",
  "/favicon.ico",
  "https://js.arcgis.com/4.29/esri/themes/light/main.css",
  "https://js.arcgis.com/4.29/",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js",
  "https://unpkg.com/proj4@2.12.0/dist/proj4.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Caching resources");
      return cache.addAll(urlsToCache).catch(error => {
        console.error("Cache addAll failed:", error);
      });
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        console.log("Serving from cache:", event.request.url);
        return response;
      }
      return fetch(event.request).catch(error => {
        console.error("Fetch failed:", error);
      });
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});