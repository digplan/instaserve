import { readFileSync } from 'node:fs';
import { Server, get } from 'node:https';

class HTTPSServer extends Server {
  middleware = [];
  constructor() {
    super({
      key: readFileSync('./keys/key.pem'),
      cert: readFileSync('./keys/cert.pem'),
    });
    this.on('request', (r, s) => {
      let data = '';
      r.on('data', (s) => {
        data += s.toString();
      });
      r.on('end', () => {
        try {
          data = JSON.parse(data);
        } catch (e) {}
        this.middleware.some((f) => {
          const stop = f(r, s, data);
          return stop;
        });
      });
    });
  }
  use(farr) {
    this.middleware = [...farr, (r, s) => s.writeHead(404).end()];
  }
}

class HTTPSClient {
  static fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      get(url, options, (res, socket) => {
        let data = '';
        res.on('connect', (res, socket, head) => {
          socket.write('okay');
        });
        res.on('data', (d) => {
          data += d;
        });
        res.on('end', () => {
          resolve(data);
        });
      });
    });
  }
}

export { HTTPSServer, HTTPSClient };
