const CACHE_NAME = "points-shell-root-v6";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("points-shell-root-") && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  const isRootApp = url.origin === self.location.origin &&
    (url.pathname === "/" || /\/index\.html$/i.test(url.pathname));
  if (!isRootApp) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("text/html")) return response;
      let html = await response.clone().text();
      const launcherVersion = "20261122-grade-analysis-auth-dashboard-v12";
      const launcherTagPattern = /(<script\b[^>]*\bsrc=["'])([^"']*grade-analysis-launch\.js)(?:\?[^"']*)?(["'][^>]*>)/gi;
      let launcherTagFound = false;
      html = html.replace(launcherTagPattern, (_match, opening, source, closing) => {
        launcherTagFound = true;
        return opening + source + "?v=" + launcherVersion + closing;
      });
      if (!launcherTagFound) {
        const script = '<script src="./grade-analysis-launch.js?v=' + launcherVersion + '" defer></script>';
        const closingIndex = html.toLowerCase().lastIndexOf("</body>");
        if (closingIndex >= 0) html = html.slice(0, closingIndex) + script + html.slice(closingIndex);
        else html += script;
      }
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.set("cache-control", "no-cache");
      const modified = new Response(html, { status: response.status, statusText: response.statusText, headers });
      const cache = await caches.open(CACHE_NAME);
      await cache.put("./index.html", modified.clone());
      return modified;
    } catch (error) {
      return (await caches.match("./index.html")) || new Response("تعذر الاتصال ببرنامج POINTS.", {
        status: 503, headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
