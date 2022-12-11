const BasicAuth = (r, s) => {
  let [type, val] = r.headers.authorization.split(' ');
  if (type == 'BASIC') {
    const userpass = Buffer.from(val, 'base64').toString('ascii').split(':');
    const { user, token } = this.authorize(userpass);
    if (!user || !token) {
      s.writeHead(401).end();
      return true;
    }
    this.tokens[token] = user;
    s.end(token);
    return true;
  }
};

const BearerAuth = (r, s) => {
  if (type == 'BEARER') {
    if (r.url === '/logout' && this.tokens[val]) {
      delete this.tokens[val];
      s.writeHead(302, 'Location: /').end();
      return true;
    }
    if (!this.tokens[val]) return s.writeHead(401).end();
  }
  return false;
};

const Static = (r, s) => {
  if (r.method !== 'GET') return false;
  const fn = `./public${r.url == '/' ? '/index.html' : r.url}`;
  if (existsSync(fn)) {
    s.end(readFileSync(fn).toString());
    return true;
  }
};

const Events = (r, s) => {
  if (r.url !== '/events') return false;
  s.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  const conn_id = new Date().toISOString() + Math.random();
  const clients = this.sse_clients;
  clients[conn_id] = s;
  s.socket.on('close', function () {
    console.log('Client leave');
    delete clients[conn_id];
  });
  return true;
};

const crypto = await import('node:crypto');

const replaceChars = (s) => {
  s = s.replaceAll('=', '');
  s = s.replaceAll('+', '-');
  s = s.replaceAll('/', '_');
  return s;
};

class JWT {
  constructor(private_key) {
    this.key = private_key;
  }
  create(payload) {
    const header = replaceChars(Buffer.from('{"typ":"JWT","alg":"HS256"}').toString('base64'));
    payload = replaceChars(Buffer.from(JSON.stringify(payload)).toString('base64'));
    const signature = this.sign(header, payload);
    return `${header}.${payload}.${signature}`;
  }
  sign(header, payload) {
    let signature = crypto.createHmac('sha256', this.key);
    return replaceChars(
      (signature.update(`${header}.${payload}`), signature.digest('base64'))
    );
  }
  verify(jwt) {
    if (!jwt) return false;
    const [header, payload, signature] = jwt.split('.');
    if (!header || !payload || !signature) return false;
    if(this.sign(header, payload) !== signature)
      return false;
    return Buffer.from(payload, 'base64').toString('ascii');
  }
}

const JwtAuth = (auth, redir, key, expdays = 7) => {
  const jwt = new JWT(key);
  return function (r, s) {
    if (r.url === '/token') {
      const now = +new Date();
      s.writeHead(301, {
        'Location': redir,
        'Set-Cookie': 'cb=' + jwt.create({ iat: now, exp: now + 8640000 * expdays })
      });
      return s.end();
    }
    const jwtstring = r.headers.cookie.replace('cb=', '');
    if (!jwt.verify(jwtstring)) {
      return s.writeHead(401).end();
    }
  };
};

const SimpleStore = (r, s, data) => {
  if(!r.url.startsWith('/api'))
    return false;
  switch(r.method) {
    case 'POST':

    case 'PATCH':

    case 'DELETE':

    case 'GET':

  }
  return s.writeHead(500).end();
}

export { JwtAuth, BasicAuth, BearerAuth, Static, Events };
