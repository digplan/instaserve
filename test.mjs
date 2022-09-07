import serve from './module.mjs'
import { get, te } from '../instax/module.mjs'

const server = serve({
    '/api': (r, s, data) => {
        s.end(data.a.toString())
    }
})

const resp = await get('http://localhost:3000/api', {method: 'POST', body: JSON.stringify({a: 1})})
te(resp, 1)

te(server.stop(), true)
console.log('closing server')