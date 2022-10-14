#!/usr/local/bin/node

import server from './module.mjs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import fs from 'node:fs'
const routesfile = resolve(process.env.routes || 'routes.mjs')
const [npx, instaserve, cmd] = process.argv

if (cmd === 'create' && !fs.existsSync(routesfile)) {
  fs.writeFileSync(routesfile, `export default {
        _debug: ({method, url}, s) => !console.log(method, url),
        _example: (r, s) => console.log('returning a falsy value (above) will stop the chain'),
        api: (r, s) => 'an example api response'
  }`)
}

const routesurl = pathToFileURL(routesfile).href
const routes = (await import(routesurl)).default
server(routes, process.env.port, process.env.ip)