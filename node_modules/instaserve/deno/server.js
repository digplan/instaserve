import { existsSync } from "https://deno.land/std/fs/mod.ts"; 
import routes from '../routes.mjs'
console.log(routes)

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

}, {port: 3000})
