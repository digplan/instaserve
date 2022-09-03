import {existsSync} from 'fs'
import routes from '../routes.mjs'
console.log(routes)

class s {
    end(s) {
        this.resp = s
    }
}

Bun.serve({
    port: 3000,
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

console.log('Running on 3000')