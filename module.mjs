import http from 'node:http'
import fs from 'node:fs'
const debug = process.env.debug

export default function (routes = { _debug: ({ method, url }, s) => console.log(method, url) }, port = 3000) {

    const server = http.createServer(async (r, s) => {
        let data = ''
        r.on('data', (s) => data += s.toString().trim())
        r.on('end', (x) => {
            try {
                if (debug) console.log(`parsing data: "${data}"`)
                if(data) data = JSON.parse(data)
                const midware = Object.keys(routes)
                    .filter((k) => k.startsWith('_'))
                    .find((k) => routes[k](r, s, data))
                if (r.url == '/') r.url = '/index.html'
                const fn = `./public${r.url.replace('..', '')}`
                if (fs.existsSync(fn)) {
                    if (fn.match(/sw\.js/)) s.writeHead(200, { 'Content-Type': 'application/javascript' })
                    return s.end(fs.readFileSync(fn, 'utf-8'))
                }
                const url = '/' + r.url.split('/')[1]
                if (routes[url]) return routes[url](r, s, data)
                throw Error(r.url + ' not found')
            } catch (e) {
                console.log(e)
                s.writeHead(404).end()
            }
        })
    }).listen(port)

    return {
        stop: () => { server.close(); return true }
    }

}
