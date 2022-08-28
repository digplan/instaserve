import { existsSync } from "https://deno.land/std/fs/mod.ts"; 
import routes from '../routes.mjs'
console.log(routes)

const s = { end: (str) => new Response(str) }

Deno.serve(async (r) => {
  const data = await r.text()
  const midware = Object.keys(routes)
    .filter((k) => k.startsWith('_'))
    .find((k) => routes[k](r, s, data))

  const u = new URL(r.url).pathname.split('/')
  if (!u[1]) u[1] = 'index.html'
  const fn = `public/${u[1]}`
  console.log(fn)
  if (await existsSync(fn)) {
    return new Response(await Deno.readTextFile(fn), {headers:{'Content-Type': 'text/html'}})
  }

  return routes[`/${u[1]}`](r, { end: (str) => new Response(str) }, data)
}, {port: 3000})
