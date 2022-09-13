import serve from './module.mjs'
import { get, te } from '../instax/module.mjs'

const server = serve({
    api: (r, s) => s.end('Hello!'),
    api2: (r, s, data) => JSON.stringify(data)
}, 3001)

const resp = await get('http://localhost:3001/api')
te(resp, 'Hello!')
const resp2 = await get('http://localhost:3001/api2', {method: 'POST', body: JSON.stringify({a:1})})
te(resp2, 'Hello!')

te(server.stop(), true)
console.log('tests complete')