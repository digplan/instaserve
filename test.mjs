import serve from './module.mjs'
import { get, te } from '../instax/module.mjs'

const server = serve({
    '/api': (r, s) => s.end('ok')
})

const resp = await get('http://localhost:3000/api')
te(resp, 'ok')

te(server.stop(), true)
