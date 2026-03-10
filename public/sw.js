// Placeholder service worker - prevents 404 when browser requests /sw.js
// (e.g. from cached PWA registration or browser extensions)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
