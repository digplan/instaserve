import FS from 'node:fs'

export default {
    _debug: ({ r, s, db }) => console.log(r.url, r.method, db),
    _message: ({ r, s, db }) => console.log('I am an info message, shown on every request'),

    '/': ({ s }) => s.end(FS.readFileSync('public/index.html', 'utf-8')),
    'tables': name => ([k, v]) => k.match(`${name}:`)
}