# instaserve
Instant web stack

> npx instaserve (node)
Starts a server in the current directory
Creates a routes.mjs file if none exists
Create a public folder and add files for static file serving

> npm run deno (deno)
Starts a deno server using routes.mjs and static serving

> npm run bun (bun)
Starts a bun server

> debug=true npx instaserve
Show more request info

###Script usage
````
import serve from 'instaserve'
serve({

    // routes prefixed with _ run on every request

    _log: (r, s) => console.log(r.method, r.url),
    _example: (r, s) => console.log('returning a falsy value (above) will stop processing'),

    api: (r, s, body) => s.end('an api response'),

}, port)  // port is optional (3000)
````

###Routes.mjs file example
````
export default {
      _debug: ({ method, url }, s, data) => !console.log(method, url, data),
      _example: (r, s, data) => console.log('returning a falsy value (above) will stop the chain'),
      api: (r, s, data) => s.end('an example api response')
}
````