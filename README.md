# instaserve
Instant web stack

In any folder:

> npx instaserve
Starts a server in the current directory
Create a public folder and add files for static file serving
Use a routes.mjs or one will be created automatically

> npm run deno (deno)
Starts a deno server using routes.mjs and static serving

> npm run bun (bun)
Starts a bun server

> port=8080 npx instaserve
Use custom port and routes file

###Script usage
````
import serve from 'instaserve'
serve({

    // routes prefixed with "_" run on every request

    _log: (r, s) => console.log(r.method, r.url),
    _example: (r, s) => console.log('returning a falsy value (above) will stop processing'),

    api: (r, s, body) => s.end('an api response'),

}, port)  // port is optional (3000)
````

###Routes.mjs file example - data is request body + query string
````
export default {
      _debug: ({ method, url }, s, data) => !console.log(method, url, data),
      _example: (r, s, data) => console.log('returning a truthy value (above) will stop the chain'),
      api: (r, s, data) => s.end('an example api response')
}
````

###Helpers
````
saveJSON(url, file, fetch_options)
````