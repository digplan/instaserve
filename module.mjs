import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'

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

function public_file(r, s, publicDir) {
  if (r.url == '/') r.url = '/index.html'
  const fn = path.resolve(publicDir, r.url.replace(/\.\./g, '').replace(/^\//, ''))
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

export default async function (routes, port = params.port || 3000, ip = params.ip || '127.0.0.1', routesFilePath = null) {
  const publicDirParam = params.public || './public'
  const publicDir = path.isAbsolute(publicDirParam)
    ? publicDirParam
    : path.resolve(process.cwd(), publicDirParam)
  if (publicDir.includes('..')) {
    throw new Error('Public directory path cannot contain ".."')
  }
  if (!fs.existsSync(publicDir)) {
    throw new Error(`Public directory "${publicDir}" does not exist`)
  }

  const requestHandler = async (r, s) => {
    let sdata = '', rrurl = r.url || ''
    let responseSent = false

    // Helper to check if value is a 3-digit HTTP status code
    const isStatusCode = (val) => {
      return typeof val === 'number' && val >= 100 && val <= 999 && Math.floor(val) === val
    }

    // Helper to send response, handling status codes
    const sendResponse = (result) => {
      if (isStatusCode(result)) {
        s.writeHead(result)
        s.end()
      } else {
        if (result != "SSE") {
          s.end(typeof result === 'string' ? result : JSON.stringify(result))
        }
      }
    }

    r.on('data', (s) => sdata += s.toString().trim())
    r.on('end', async (x) => {
      try {
        // Compose data object
        const data = sdata ? JSON.parse(sdata) : {}
        const qs = rrurl.split('?')
        if (qs && qs[1]) {
          const o = JSON.parse('{"' + decodeURI(qs[1].replace(/&/g, "\",\"").replace(/=/g, "\":\"")) + '"}')
          Object.assign(data, o)
        }

        const midwareKeys = Object.keys(routes).filter((k) => k.startsWith('_'))
        for (const k of midwareKeys) {
          let result = routes[k](r, s, data)
          if (result instanceof Promise) result = await result

          if (result) {
            if (!responseSent) {
              responseSent = true
              sendResponse(result)
            }
            break
          }
        }

        // Response closed by middleware
        if (responseSent || s.writableEnded) return

        // Try to serve public file
        if (public_file(r, s, publicDir)) {
          responseSent = true
          return
        }

        const urlParts = rrurl.split('/')
        const url = urlParts.length > 1 ? urlParts[1].split('?')[0] : ''
        const method = (r.method || 'GET').toUpperCase()

        // Try method-specific route first (e.g., "POST /endp", "GET /")
        const methodRoute = url ? `${method} /${url}` : `${method} /`
        let routeHandler = routes[methodRoute]

        // If no exact match, check if any method-specific route exists for this path
        if (!routeHandler) {
          const methods = ['GET', 'POST', 'PUT', 'DELETE']
          const pathRoute = url ? `/${url}` : `/`
          const hasMethodSpecificRoute = methods.some(m => {
            const checkRoute = url ? `${m} /${url}` : `${m} /`
            return routes[checkRoute] !== undefined
          })

          // If method-specific route exists but for different method, return 405
          if (hasMethodSpecificRoute) {
            if (!responseSent && !s.writableEnded) {
              responseSent = true
              s.writeHead(405)
              s.end()
            }
            return
          }

          // Fall back to path-only route (backward compatible)
          routeHandler = routes[url]
        }

        if (routeHandler) {
          let resp = routeHandler(r, s, data)
          if (resp instanceof Promise) resp = await resp

          if (!responseSent && !s.writableEnded) {
            responseSent = true
            sendResponse(resp)
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
    const certPath = path.resolve(process.cwd(), './cert.pem')
    const keyPath = path.resolve(process.cwd(), './key.pem')

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
  const routesInfo = Object.keys(routes).length > 0
    ? (routesFilePath ? `using routes: ${Object.keys(routes)} (${routesFilePath})` : `using routes: ${Object.keys(routes)}`)
    : 'not using routes'
  console.log(`started on: ${protocol}://${(process.env.ip || ip)}:${(process.env.port || port)}, public: ${publicDir}, ${routesInfo}`)

  return {
    routes: routes,
    port: port,
    server: server,
    stop: () => { server.close(); return true }
  }
}