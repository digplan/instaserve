import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'

const args = process.argv.slice(2)
const params = {}
for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('-')) {
        const key = arg.slice(1)
        const nextArg = args[i + 1]
        if (nextArg && !nextArg.startsWith('-')) {
            params[key] = nextArg
            i++ // Skip the next argument since we used it
        } else {
            params[key] = true // Boolean flag
        }
    }
}

function public_file(r, s) {
    if (r.url == '/') r.url = '/index.html'
    const fn = `${params.public || './public'}${r.url.replace(/\.\./g, '')}`
    if (fs.existsSync(fn)) {
        const content = fs.readFileSync(fn, 'utf-8')
        if (fn.match(/.js$/)) {
            s.writeHead(200, { 'Content-Type': 'application/javascript' })
        } else {
            s.writeHead(200)
        }
        s.end(content)
        return true // Indicate file was served
    }
    return false // Indicate no file was served
}

export default async function (routes, port = params.port || 3000, ip = params.ip || '127.0.0.1') {
    const publicDir = params.public || './public'
    if (publicDir.includes('..')) {
        throw new Error('Public directory path cannot contain ".."')
    }
    if (!fs.existsSync(publicDir)) {
        throw new Error(`Public directory "${publicDir}" does not exist`)
    }

    const requestHandler = async (r, s) => {
        let sdata = '', rrurl = r.url || ''
        let responseSent = false
        
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
                    .find((k) => {
                        const result = routes[k](r, s, data)
                        if (result && !responseSent) {
                            responseSent = true
                            s.end(typeof result === 'string' ? result : JSON.stringify(result))
                        }
                        return result
                    })

                // Response closed by middleware
                if(responseSent || s.writableEnded) return

                // Try to serve public file
                if(public_file(r, s)) {
                    responseSent = true
                    return
                }

                const url = rrurl.split('/')[1].split('?')[0]
                if (routes[url]) {
                    const resp = routes[url](r, s, data)
                    if (!responseSent && !s.writableEnded) {
                        responseSent = true
                        s.end(typeof resp === 'string' ? resp:JSON.stringify(resp))
                    }
                    return
                }
                
                if (!responseSent && !s.writableEnded) {
                    responseSent = true
                    s.writeHead(404);
                    s.end();
                }
            } catch (e) {
                console.error(e.stack)
                if (!responseSent && !s.writableEnded) {
                    responseSent = true
                    s.writeHead(500).end()
                }
            }
        })
    }

    let server
    if (params.secure) {
        const certPath = './cert.pem'
        const keyPath = './key.pem'
        
        if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
            throw new Error('Certificate files not found. Run ./generate-certs.sh first.')
        }
        
        const options = {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath)
        }
        
        server = https.createServer(options, requestHandler)
    } else {
        server = http.createServer(requestHandler)
    }

    server.listen(port || 3000, ip || '')

    const protocol = params.secure ? 'https' : 'http'
    console.log(`started on: ${protocol}://${(process.env.ip || ip)}:${(process.env.port || port)}, public: ${publicDir}, ${Object.keys(routes).length > 0 ? `using routes: ${Object.keys(routes)}` : 'not using routes'}`)
    
    return {
        routes: routes,
        port: port,
        server: server,
        stop: () => { server.close(); return true }
    }
}