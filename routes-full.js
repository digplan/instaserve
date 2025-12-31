import auth0 from "./lib/auth0.js";
import { fileRoutes } from "./lib/r2.js";
import sqlite from "./lib/sqlite.js";

export default {
  _log: (req, res) => {
    console.log(req.method, req.url);
  },
  ...auth0,
  ...fileRoutes,
  ...sqlite
};