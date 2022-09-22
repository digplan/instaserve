import {existsSync} from 'fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
const routesfile = resolve(process.env.routes || '../routes.mjs')
const routesurl = pathToFileURL(routesfile).href

const routes = (await import(routesurl)).default
const port = process.env.port || 3000

class s {
    end(s) {
        this.resp = s
    }
}

Bun.serve({
    port: port,
    async fetch(r) {

        let url = new URL(r.url).pathname
        const data = await r.text()

        const ru = {method: r.method, url: url}
        const rs = new s()
        
        const midware = Object.keys(routes)
            .filter(k => k.startsWith('_'))
            .find(k => routes[k](ru, rs, data))

        // Routes.mjs
        if(routes[url]) {
            const f = routes[url](ru, rs, data)
            return new Response(rs.resp)
        }
        
        // Static
        const fn = (url == '/') ? `public/index.html` : `public/${url}`
        if (existsSync(fn))
          return new Response(Bun.file(fn))

        return new Response('', { status: 404 })

    },
    error(e) {
        console.error(e)
        return new Response('', { status: 404 })
    }
})

console.log(`Started on: ${port}, using routes: ${Object.keys(routes)}`)