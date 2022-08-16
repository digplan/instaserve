/* 
routes.mjs
Unders
*/

import FS from 'node:fs'
export default {
    _debug: ({ r, s, db }) => console.log(r.url, r.method),
    _static: ({r, s}) => {
        if(r.url == '/') r.url = '/index.html'
        const fn = `./public${r.url.replace('..', '')}`
        if(FS.existsSync(fn)) {
            if (fn.match(/sw\.js/)) s.writeHead(200, { 'Content-Type': 'application/javascript' })
            return !s.end(FS.readFileSync(fn, 'utf-8'))
        }
    },

    '/api': ({s})=>s.end('example of an api response'),
}