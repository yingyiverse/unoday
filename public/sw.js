const CACHE_VERSION = 'v1'
const STATIC_CACHE = 'unoday-static-' + CACHE_VERSION

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !k.endsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          const cache = await caches.open(STATIC_CACHE)
          cache.put(req, res.clone())
          return res
        } catch {
          const cached = await caches.match(req)
          if (cached) return cached
          const html =
            '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;padding:2rem;background:#111921;color:#fff}a{color:#308ce8}</style></head><body><h1>UnoDay</h1><p>You are offline.</p><p>Core features work when online. Try again later.</p></body></html>'
          return new Response(html, { headers: { 'Content-Type': 'text/html' } })
        }
      })()
    )
    return
  }
  const destinations = ['style', 'script', 'image', 'font']
  if (destinations.includes(req.destination) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE)
        const cached = await cache.match(req)
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone())
            return res
          })
          .catch(() => null)
        return cached || network || fetch(req)
      })()
    )
  }
})

