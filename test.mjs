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

// Super shorthand
const db = {}
const min_server = serve({
    c: (r, s, data) => db[data.id] = data,
    r: (r) => db[r.url.split('/').pop()],
    u: (r, s, data) => db[data.id] ? 'exists!' : db[data.id] = data,
    d: (r, s, data) => db[data.id] ? delete db[data.id] : 'does not exist!',
    q: (r, s, data) => JSON.stringify(Array.from(Object.values(db)).filter(eval(`i=>${data}`)))
})
serve(min_server)
console.log('tests complete')