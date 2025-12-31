/**
 * SQLite Database & Key-Value Store Module
 * 
 * Usage:
 * 1. Import this module to initialize the database ('data.db') and tables ('users', 'kv').
 * 2. Access the database instance via `global.sqlite`.
 * 3. Exported routes provide a per-user Key-Value store mechanism guarded by the `_auth` middleware.
 * 
 * Tables created:
 * - users: id, username, pass, token, picture, name, email
 * - kv: key (format: "username:key"), value
 * 
 * Routes provided:
 * - _auth: Middleware for protecting routes (assigns `req.user`).
 * - POST /api: Set a KV pair for the logged-in user.
 * - GET /api: Get a value by key.
 * - GET /all: List all keys/values for the user.
 * - DELETE /api: Delete a key.
 */

import Database from "better-sqlite3";

// Initialize database
global.sqlite = new Database("data.db");
sqlite.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, pass TEXT, token TEXT, picture TEXT, name TEXT, email TEXT)").run();
sqlite.prepare("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)").run();

// Combine all routes
export default {
  _auth: (req, res, data) => {
    if (req.url === '/' || req.url.match(/js|html|css|callback/)) return;

    if (req.url.startsWith("/register") || req.url.startsWith("/login")) return;

    const token = req.headers.cookie?.split('token=')[1].split(';')[0];
    if (!token) { return 401; }
    const user = sqlite.prepare("SELECT * FROM users WHERE token = ?").get(token);
    if (!user) return 401;
    req.user = user.username;
  },
  "POST /api": (req, res, data) => {
    sqlite.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)").run(req.user + ":" + data.key, data.value);
    return sqlite.prepare("SELECT substr(key, instr(key, ':') + 1) AS key, value FROM kv WHERE key = ?").get(req.user + ":" + data.key);
  },
  "GET /api": (req, res, data) => {
    return sqlite.prepare("SELECT substr(key, instr(key, ':') + 1) AS key, value FROM kv WHERE key = ?").get(req.user + ":" + data.key) || {};
  },
  "GET /all": (req, res, data) => {
    const rows = sqlite.prepare("SELECT substr(key, instr(key, ':') + 1) AS key, value FROM kv WHERE key LIKE ?").all(req.user + ":%");
    return rows || [];
  },
  "DELETE /api": (req, res, data) => {
    sqlite.prepare("DELETE FROM kv WHERE key = ?").run(req.user + ":" + data.key);
    return { deleted: true, key: data.key };
  }
};
