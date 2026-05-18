const CACHE_NAME = "worshipteam-db-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/manifest.json",
  "/stack.html",
  "/pages/songs.html",
  "/pages/leaders.html",
  "/pages/calendar.html",
  "/pages/archive.html",
  "/assets/js/pwa.js",
  "/assets/js/supabase-client.js",
  "/assets/js/songs.js",
  "/assets/js/leaders.js",
  "/assets/js/calendar.js",
  "/assets/js/archive.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      });
    })
  );
});