import http from 'node:http'
import fs from 'node:fs'

const args = process.argv.slice(2)
const params = Object.fromEntries(args.map(a => a.startsWith('-') ? [a.slice(1), args[args.indexOf(a) + 1]] : []).filter(a => a.length))

function public_file(r, s) {
    if (r.url == '/') r.url = '/index.html'
    const fn = `${params.public || './public'}${r.url.replace(/\.\./g, '')}`
    if (fs.existsSync(fn)) {
        if (fn.match(/.js$/)) s.writeHead(200, { 'Content-Type': 'application/javascript' })
        return fs.readFileSync(fn, 'utf-8')
    }
}

export default async function (routes, port = params.port || 3000, ip = params.ip || '127.0.0.1') {
    const publicDir = params.public || './public'
    if (publicDir.includes('..')) {
        throw new Error('Public directory path cannot contain ".."')
    }
    if (!fs.existsSync(publicDir)) {
        throw new Error(`Public directory "${publicDir}" does not exist`)
    }
    
    if (params.api) {
        const imported = await import(params.api)
        routes = imported.default
    }

    const server = http.createServer(async (r, s) => {
        let sdata = '', rrurl = r.url || ''
        r.on('data', (s) => sdata += s.toString().trim())
        r.on('end', (x) => {
            try {
                // Compose data object
                const data = sdata ? JSON.parse(sdata) : {}
                const qs = rrurl.split('?')
                if(qs && qs[1]) {
                    const o = JSON.parse('{"' + decodeURI(qs[1].replace(/&/g, "\",\"").replace(/=/g, "\":\"")) + '"}')
                    Object.assign(data, o)
                }

                const midware = Object.keys(routes)
                    .filter((k) => k.startsWith('_'))
                    .find((k) => routes[k](r, s, data))

                // Response closed by middleware
                if(s.writableEnded) return

                const fc = public_file(r, s)
                if(fc) return s.end(fc)

                const url = rrurl.split('/')[1].split('?')[0]
                if (routes[url]) {
                    const resp = routes[url](r, s, data)
                    return s.end(typeof resp === 'string' ? resp:JSON.stringify(resp))
                }
                s.writeHead(404);
                s.end();
            } catch (e) {
                console.error(e.stack)
                s.writeHead(500).end()
            }
        })
    }).listen(port || 3000, ip || '')

    console.log(`started on: ${(process.env.ip || ip)}:${(process.env.port || port)}, public: ${publicDir}, ${params.api ? `using routes: ${Object.keys(routes)}` : 'not using routes'}`)
    
    return {
        routes: routes,
        port: port,
        server: server,
        stop: () => { server.close(); return true }
    }
}
