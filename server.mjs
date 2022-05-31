#!/usr/bin/env node

import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const routesfile = resolve('routes.mjs');
const routesurl = pathToFileURL(routesfile).href;
console.log(routesfile, routesurl);

const routes = (await import(routesurl)).default;
const VastDB = (await import(`./vastdb.mjs`)).default;
const db = new VastDB(routes);
console.log(db.filename, routes);

http
  .createServer(async (r, s) => {
    try {
      let data = '';
      r.on('data', (s) => (data += s.toString()));
      r.on('end', (x) => {
        try {
          data = JSON.parse(data);
        } catch {}
      });
      s.endJSON = (o) => s.end(JSON.stringify(o));
      const midware = Object.keys(routes)
        .filter((k) => k.startsWith('_'))
        .map((k) => routes[k]({ r, s, data, db }));
      if (midware.includes(true)) return;
      if (routes[r.url]) return routes[r.url]({ r, s, data, db });
      else s.writeHead(404).end();
    } catch (e) {
      console.log(e);
      s.writeHead(404).end();
    }
  })
  .listen(3000, (x) => console.log('listening on 3000'));
