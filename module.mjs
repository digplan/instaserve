import http from 'node:http'
import fs from 'node:fs'

export default function (routes = {_debug: ({method, url}, s) => console.log(method, url)}, port = 3000) {
    const server = http.createServer(async (r, s) => {
        try {
            let data = ''
            r.on('data', (s) => (data += s.toString()))
            r.on('end', (x) => {
                try {
                    data = JSON.parse(data)
                } catch { }
            })
            const midware = Object.keys(routes)
                .filter((k) => k.startsWith('_'))
                .find((k) => routes[k](r, s, data))
            if (r.url == '/') r.url = '/index.html'
            const fn = `./public${r.url.replace('..', '')}`
            if (fs.existsSync(fn)) {
                if (fn.match(/sw\.js/)) s.writeHead(200, { 'Content-Type': 'application/javascript' })
                return s.end(fs.readFileSync(fn, 'utf-8'))
            }
            if (routes[r.url]) return routes[r.url](r, s, data)
            else s.writeHead(404).end()
        } catch (e) {
            console.log(e)
            s.writeHead(404).end()
        }
    })
    .listen(port)
    return {
        stop: ()=> { server.close(); return true }
    }
}
