import { HTTPSServer, HTTPSClient } from './index.mjs';
import { JwtAuth, SimpleStore, Static } from './middleware.mjs';

const server = new HTTPSServer();
const Db = SimpleStore();
const Jwt = JwtAuth(Db.auth, '/', 'mykey');

server.use([Jwt, Db, Static]);
server.listen(80);
console.log('listening on 80');
