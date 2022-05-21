self.addEventListener('fetch', event => {
  const cache = await caches.open('e')
  const req = event.request

  event.respondWith(async () => {
    if(!req.url.match(/\.js$|\.css$/))
      return fetch(req)

    const response = await cache.match(req)
    if(response) return response
    response = await fetch(req)

    if(response.status == 200)
      cache.put(req, response)

    return response
  })
})