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

###Script usage
````
import serve from 'instaserve'
serve({
    '_log': (r, s) => console.log(r.method, r.url),
    '/api': (r, s, body) => s.end('an api response'),
})
````

###Routes.mjs file example
````
export default {
      _debug: ({ method, url }, s, data) => !console.log(method, url, data),
      _example: (r, s, data) => console.log('returning a falsy value (above) will stop the chain'),
      '/api': (r, s, data) => s.end('an example api response')
}
````