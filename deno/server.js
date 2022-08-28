const routes = (await import('../routes.mjs')).default
console.log(routes)

Deno.serve(async (r) => {
  let data = ''
  if(r.method == 'POST') data = await r.text()
  let u = r.url.replace('http://127.0.0.1:9000', '').split('/')
  const midware = Object.keys(routes)
    .filter((k) => k.startsWith('_'))
    .find((k) => routes[k](r, null, data))
  if (u == '/') u = '/index.html'
  const fn = `./public${u.replace('..', '')}`
  //if (fs.existsSync(fn)) {
  //  if (fn.match(/sw\.js/)) s.writeHead(200, { 'Content-Type': 'application/javascript' })
 //   return s.end(fs.readFileSync(fn, 'utf-8'))
  //}
  console.log(fn)
  if (routes[r.url]) return routes[r.url](r, s, data)
  return routes[u[2]](u, data)
})