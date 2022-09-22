import { existsSync } from "https://deno.land/std/fs/mod.ts"; 

const routesfile = Deno.env.get('routes') || '../routes.mjs'
const port = Deno.env.get('port') || 3000
const routes = (await import(routesfile)).default

class s {
  end(s) {
    this.resp = s
  }
}

Deno.serve(async (r) => {

  const data = await r.text()
  let url = new URL(r.url).pathname
  const ru = { method: r.method, url: url }
  const rs = new s()

  const midware = Object.keys(routes)
    .filter((k) => k.startsWith('_'))
    .find((k) => routes[k](ru, rs, data))

  // Routes.mjs
  if (routes[url]) {
    const f = routes[url](ru, rs, data)
    return new Response(rs.resp)
  }

  // Static
  const fn = (url == '/') ? `public/index.html` : `public/${url}`
  if (existsSync(fn))
    return new Response(await Deno.readTextFile(fn), { headers: { 'Content-Type': 'text/html' } })

  return new Response('', { status: 404 })

}, {port: port})

console.log(`routes: ${Object.keys(routes)}`)
