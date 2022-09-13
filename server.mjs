#!/usr/bin/env node

import server from './module.mjs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import fs from 'node:fs'
const routesfile = resolve('routes.mjs')

if (!fs.existsSync(routesfile)) {
  fs.writeFileSync(routesfile, `export default {
        _debug: ({method, url}, s) => !console.log(method, url),
        _example: (r, s) => console.log('returning a falsy value (above) will stop the chain'),
        api: (r, s) => 'an example api response'
  }`)
}

const routesurl = pathToFileURL(routesfile).href
console.log(routesfile, routesurl)
const routes = (await import(routesurl)).default
server(routes)