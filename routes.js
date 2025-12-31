import auth0 from "./lib/auth0.js";
import { fileRoutes } from "./lib/r2.js";
import sqlite from "./lib/sqlite.js";

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
  ...auth0,
  ...fileRoutes,
  ...sqlite
};
