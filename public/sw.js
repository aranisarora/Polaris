/**
 * Polaris service worker.
 * - Version-stamped cache; activation deletes every older cache.
 * - Precaches the app shell ('/', manifest, icons).
 * - Navigations: network-first, offline fallback to the cached shell.
 * - Authenticated pages (/cv, /roadmap, ...) are NEVER written to Cache
 *   Storage — they hold personal data that must not survive sign-out on a
 *   shared device. Offline they fall back to the precached '/' shell.
 * - /_next/static, /icons, fonts: cache-first (immutable/stable assets).
 * - Never touches non-GET requests, /api, or /auth.
 */

// v2: authenticated page HTML is no longer cached; the version bump purges
// anything v1 stored.
const VERSION = "polaris-v2";

/** Authenticated routes whose HTML contains personal data. */
const PRIVATE_PREFIXES = ["/onboarding", "/profile", "/bearing", "/roadmap", "/cv"];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) =>
        // Individually settled so one missing asset can't block install.
        Promise.allSettled(PRECACHE.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheable) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (cacheable && response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = cacheable ? await cache.match(request) : undefined;
    if (cached) return cached;
    const shell = await cache.match("/");
    if (shell) return shell;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // GET only — mutations must always hit the network.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only; and never intercept API or auth traffic.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  if (request.mode === "navigate") {
    // Personal pages are served network-first but never cached: nothing to
    // purge on sign-out, and offline they fall back to the public shell.
    event.respondWith(networkFirst(request, !isPrivatePath(url.pathname)));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    request.destination === "font"
  ) {
    event.respondWith(cacheFirst(request));
  }
});
