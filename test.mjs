import serve from './module.mjs'
import { get, te } from 'instax'

const server = serve({
    '/api': (r, s) => s.end('Hello!')
}, 3001)

const resp = await get('http://localhost:3001/api')
te(resp, 'Hello!')

te(server.stop(), true)
console.log('closing server')