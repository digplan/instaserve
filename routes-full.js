import auth0 from "./lib/auth0.js";
import { fileRoutes } from "./lib/r2.js";
import sqlite from "./lib/sqlite.js";
import sse from "./lib/sse.js";

export default {
  _log: (req, res) => {
    console.log(req.method, req.url);
  },
  _cors: (req, res) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      return 204;
    }
  },
  _auth: (req, res, data) => {
    if (req.url === '/' || req.url.match(/js|html|css|callback|logout|login|register/)) return;
    const token = req.headers.cookie?.split('token=')[1].split(';')[0];
    //console.log("Token:", token);
    if (!token) return 401;
    const user = global.sqlite.prepare("SELECT * FROM users WHERE token = ?").get(token);
    //console.log("User:", user);
    if (!user) return 401;
    req.user = user.username;
    //console.log("Authenticated user:", req.user);
  },
  ...auth0,
  ...fileRoutes,
  ...sqlite,
  ...sse
};