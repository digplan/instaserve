import url from 'node:url'

export default {
        _debug: ({method, url}, s) => !console.log(method, url),
        _example: (r, s) => console.log('returning a falsy value (above) will stop the chain'),
        api: (r, s) => 'an example api response',
        testerror: () => { throw new Error('this from testerror') },
        testdata: (r, s, c, d) => c
  }