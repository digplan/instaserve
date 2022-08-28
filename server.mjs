#!/usr/bin/env node

import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import fs from 'node:fs'

const routesfile = resolve('routes.mjs')

if (!fs.existsSync(routesfile)) {
  fs.writeFileSync(routesfile, `export default {
        _debug: ({method, url}, s) => !console.log(method, url),
        _example: (r, s) => console.log('returning a falsy value (above) will stop the chain'),
        '/api': (r, s) => s.end('an example api response')
  }`)
}

const routesurl = pathToFileURL(routesfile).href
console.log(routesfile, routesurl)
const routes = (await import(routesurl)).default

http
  .createServer(async (r, s) => {
    try {
      let data = ''
      r.on('data', (s) => (data += s.toString()))
      r.on('end', (x) => {
        try {
          data = JSON.parse(data)
        } catch {}
      });
      const midware = Object.keys(routes)
        .filter((k) => k.startsWith('_'))
        .find((k) => routes[k](r, s, data));
      if (r.url == '/') r.url = '/index.html'
      const fn = `./public${r.url.replace('..', '')}`
      if (fs.existsSync(fn)) {
        if (fn.match(/sw\.js/)) s.writeHead(200, { 'Content-Type': 'application/javascript' })
        return s.end(fs.readFileSync(fn, 'utf-8'))
      }
      if (routes[r.url]) return routes[r.url](r, s, data)
      else s.writeHead(404).end()
    } catch (e) {
      console.log(e)
      s.writeHead(404).end()
    }
  })
  .listen(3000, (x) => console.log('listening on 3000'))
