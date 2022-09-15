import serve from './module.mjs'
import { get, te, tde } from '../instax/module.mjs'

const server = serve({
    api: (r, s) => 'Hello!',
    api2: (r, s, data) => JSON.stringify(data)
}, 8080)
te(server.port, 8080)

// Routes
const resp = await get('http://localhost:8080/api')
te(resp, 'Hello!')
const resp2 = await get('http://localhost:8080/api2', {method: 'POST', body: JSON.stringify({a:1})})
tde(resp2, {a:1})

// Public
const testhtml = await get('http://localhost:8080/test.html')
te(testhtml, 'ok')

te(server.stop(), true)
console.log('tests complete')