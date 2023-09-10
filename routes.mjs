import url from 'node:url'

export default {
        /*_testerror: ()=>console.testerrors(),*/
        _debug: ({method, url}, s, data) => { console.log(method, url, data) },
        _returnfalsy: (r, s) => { return true },
        _example: (r, s) => console.log('returning a truthy value (above) will stop the chain'),
        //_end: (r, s) => s.end('ended early'),

        api: (r, s, data) => 'an example api response, data:' + JSON.stringify(data),
        testerror: () => { throw new Error('this from testerror') },
        testdata: (r, s, c, d) => c
  }