import http from 'node:http'
import fs from 'node:fs'
const debug = process.env.debug

function public_file(r, s) {
    if (r.url == '/') r.url = '/index.html'
    const fn = `./public${r.url.replace('..', '')}`
    if (fs.existsSync(fn)) {
        if (fn.match(/.js$/)) s.writeHead(200, { 'Content-Type': 'application/javascript' })
        return fs.readFileSync(fn, 'utf-8')
    }
}

export default function (routes, port = 3000) {
    const server = http.createServer(async (r, s) => {
        let data = ''
        r.on('data', (s) => data += s.toString().trim())
        r.on('end', (x) => {
            try {
                if (debug) console.log(`parsing data: "${data}"`)
                if (debug) console.log(`routes: "${routes}"`)
                if (data) data = JSON.parse(data)
                const midware = Object.keys(routes)
                    .filter((k) => k.startsWith('_'))
                    .find((k) => routes[k](r, s, data))

                const fc = public_file(r, s)
                if(fc) return s.end(fc)
                
                const url = r.url.split('/')[1]
                if (routes[url]) {
                    const resp = routes[url](r, s, data)
                    if(debug) console.log(`route: ${url}, returned: ${resp}`)
                    return s.end(typeof resp === 'string' ? resp:JSON.stringify(resp))
                }
                throw Error(r.url + ' not found')
            } catch (e) {
                console.log(e)
                s.writeHead(404).end()
            }
        })
    }).listen(process.env.port || port)

    console.log('started on: ' + (process.env.port || port) + ', using routes: ' + Object.keys(routes))
    
    return {
        routes: routes,
        port: port,
        server: server,
        stop: () => { server.close(); return true }
    }

}
