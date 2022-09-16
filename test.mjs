import serve from './module.mjs'
import { get, te, tde } from '../instax/module.mjs'

const port = 8080
const server = serve({
    api: (r, s) => 'Hello!',
    api2: (r, s, data) => JSON.stringify(data)
}, port)
te(server.port, port)

// Routes
const resp = await get('http://localhost:8080/api')
te(resp, 'Hello!')
const resp2 = await get('http://localhost:8080/api2', {method: 'POST', body: JSON.stringify({a:1})})
tde(resp2, {a:1})

// Public
const testhtml = await get('http://localhost:8080/test.html')
te(testhtml, 'ok')
te(server.stop(), true)

// Test route returned values
const db = {}
const server2 = serve({
    _: ({url}) => console.log(url),
    __: ({headers: {host}, method, url}) => console.log(host, method, url),
    str: () => 'ok',
    obj: x => ({a: 'ok'}),
    undef: () => undefined
}, 8085)
te(server2.port, 8085)
te(server2.routes.str(), 'ok')

const return_str = await get('http://localhost:8085/str') 
te(return_str, 'ok')

const return_obj = await get('http://localhost:8085/obj')
te(return_obj.a, 'ok')

const return_undefined = await get('http://localhost:8085/undef')
te(return_undefined, '')

server2.stop()
console.log('tests complete')