#!/usr/local/bin/node

// > npx instaserve
// > port=8080 npx instaserve

import server from './module.mjs'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs'
const [npx, instaserve, cmd] = process.argv
const {port, ip} = process.env

if (cmd === 'create' && !fs.existsSync('routes.mjs')) {
  fs.writeFileSync('routes.mjs', `export default {
        _debug: ({method, url}, s) => !console.log(method, url),
        _example: (r, s) => console.log('returning a falsy value (above) will stop the chain'),
        api: (r, s) => 'an example api response'
  }`)
}

const routesurl = pathToFileURL('routes.mjs').href
const routes = (await import(routesurl)).default
server(routes, Number(port||3000), ip)