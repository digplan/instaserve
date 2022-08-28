import {existsSync} from 'fs'
import routes from '../routes.mjs'

const s = { end: (str) => new Response(str) }

Bun.serve({
    port: 3000,
    async fetch(r) {

        let url = new URL(r.url).pathname
        if(url == '/') url = '/index.html'
        const data = await r.text()

        const midware = Object.keys(routes)
            .filter(k => k.startsWith('_'))
            .find(k => routes[k](r, s, data))

        // Static
        const fn = `public${url}`
        if(existsSync(fn))
            return new Response(Bun.file(fn))

        if(routes[url])
            return new Response(routes[url](r, { end: (str) => new Response(str) }, data))

        return new Response('', { status: 404 })

    },
    error(e) {
        console.error(e)
        return new Response('', { status: 404 })
    }
})

console.log('Running on 3000')