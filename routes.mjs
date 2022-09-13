export default {
        _debug: ({method, url}, s) => !console.log(method, url),
        _example: (r, s) => console.log('returning a falsy value (above) will stop the chain'),
        api: (r, s) => s.end('an example api response')
  }