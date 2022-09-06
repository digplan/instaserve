export default {
      _debug: ({ method, url }, s, data) => !console.log(method, url, data),
      _example: (r, s, data) => console.log('returning a falsy value (above) will stop the chain'),
      '/api': (r, s, data) => s.end('an example api response')
}