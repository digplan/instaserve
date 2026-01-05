import { Database } from "bun:sqlite";
import { S3Client } from "bun";
import { existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";

const required = ["CLOUDFLARE_ACCESS_KEY_ID", "CLOUDFLARE_SECRET_ACCESS_KEY", "CLOUDFLARE_BUCKET_NAME", "CLOUDFLARE_ACCOUNT_ID", "AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET"];
const missing = required.filter(k => !process.env[k]?.trim());
if (missing.length) {
  console.error("❌ Missing:", missing.join(", "));
  process.exit(1);
}
console.log("✓ Environment variables set");

const db = new Database("data.db");
db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, pass TEXT, token TEXT, picture TEXT, name TEXT, email TEXT)");
db.run("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)");

const [AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET] = [process.env.AUTH0_DOMAIN, process.env.AUTH0_CLIENT_ID, process.env.AUTH0_CLIENT_SECRET];
const AUTH0_CALLBACK_URL = process.env.AUTH0_CALLBACK_URL || "https://localhost:3001/callback";
const BASE_URL = process.env.BASE_URL || "https://localhost:3001";

const generateToken = () => crypto.randomBytes(32).toString("hex");
const getUserFromToken = (token) => token ? db.prepare("SELECT * FROM users WHERE token = ?").get(token) : null;
const getTokenFromRequest = (req) => {
  const cookies = req.headers.get("cookie")?.split(";").reduce((acc, c) => {
    const [k, v] = c.trim().split("=");
    return { ...acc, [k]: v };
  }, {});
  return cookies?.token || null;
};

const r2 = new S3Client({
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  bucket: process.env.CLOUDFLARE_BUCKET_NAME,
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
});
console.log("✓ R2 client initialized");

global.sseClients = [];
global.broadcast = (data) => global.sseClients.forEach(c => c.write(`data: ${JSON.stringify(data)}\n\n`));

const tls = existsSync("cert.pem") && existsSync("key.pem") ? {
  cert: await Bun.file("cert.pem").text(),
  key: await Bun.file("key.pem").text(),
} : undefined;

Bun.serve({
  port: 3001,
  tls,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method;

    if (pathname === "/login" && method === "GET") {
      return Response.redirect(`https://${AUTH0_DOMAIN}/authorize?response_type=code&client_id=${AUTH0_CLIENT_ID}&redirect_uri=${encodeURIComponent(AUTH0_CALLBACK_URL)}&scope=openid profile email&state=${generateToken()}`);
    }

    if (pathname === "/callback" && method === "GET") {
      const code = new URL(req.url).searchParams.get("code");
      const error = new URL(req.url).searchParams.get("error");
      if (error) return new Response(`Auth error: ${error}`, { status: 400 });
      if (!code) return new Response("Missing authorization code", { status: 400 });

      try {
        const tokenRes = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grant_type: "authorization_code", client_id: AUTH0_CLIENT_ID, client_secret: AUTH0_CLIENT_SECRET, code, redirect_uri: AUTH0_CALLBACK_URL }),
        });
        if (!tokenRes.ok) return new Response(`Token exchange failed: ${await tokenRes.text()}`, { status: 400 });

        const { access_token } = await tokenRes.json();
        const userInfo = await (await fetch(`https://${AUTH0_DOMAIN}/userinfo`, { headers: { Authorization: `Bearer ${access_token}` } })).json();
        const sessionToken = generateToken();

        db.prepare("INSERT OR REPLACE INTO users (id, username, token, picture, name, email) VALUES (?, ?, ?, ?, ?, ?)").run(
          userInfo.sub, userInfo.nickname || userInfo.name || userInfo.email, sessionToken, userInfo.picture || "", userInfo.name || "", userInfo.email || ""
        );

        return new Response(null, {
          status: 302,
          headers: { Location: "/", "Set-Cookie": `token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax` },
        });
      } catch (e) {
        return new Response(`Callback error: ${e.message}`, { status: 500 });
      }
    }

    if (pathname === "/logout" && method === "GET") {
      const token = getTokenFromRequest(req);
      if (token) db.prepare("UPDATE users SET token = NULL WHERE token = ?").run(token);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `https://${AUTH0_DOMAIN}/v2/logout?client_id=${AUTH0_CLIENT_ID}&returnTo=${encodeURIComponent(BASE_URL)}`,
          "Set-Cookie": "token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        },
      });
    }

    if (pathname === "/sse" && method === "GET") {
      const encoder = new TextEncoder();
      return new Response(new ReadableStream({
        start(controller) {
          const client = { write: (d) => controller.enqueue(encoder.encode(d)) };
          global.sseClients.push(client);
          controller.enqueue(encoder.encode("data: { \"status\": \"connected\" }\n\n"));
          req.signal.addEventListener("abort", () => global.sseClients = global.sseClients.filter(c => c !== client));
        },
      }), {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
      });
    }

    const requireAuth = (fn) => {
      const token = getTokenFromRequest(req);
      const user = getUserFromToken(token);
      return user ? fn(user) : Response.json({ error: "Unauthorized" }, { status: 401 });
    };

    if (pathname === "/api" && method === "POST") {
      return requireAuth(async (user) => {
        const { key, value } = await req.json();
        const kvKey = `${user.username}:${key}`;
        db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)").run(kvKey, value);
        global.broadcast({ type: "update", user: user.username, key, value });
        return Response.json(db.prepare("SELECT substr(key, instr(key, ':') + 1) AS key, value FROM kv WHERE key = ?").get(kvKey));
      });
    }

    if (pathname === "/api" && method === "GET") {
      return requireAuth((user) => {
        const key = new URL(req.url).searchParams.get("key");
        const result = db.prepare("SELECT substr(key, instr(key, ':') + 1) AS key, value FROM kv WHERE key = ?").get(`${user.username}:${key}`) || {};
        global.broadcast({ type: "update", ...result });
        return Response.json(result);
      });
    }

    if (pathname === "/all" && method === "GET") {
      return requireAuth((user) => {
        global.broadcast({ type: "all", user: user.username });
        return Response.json(db.prepare("SELECT substr(key, instr(key, ':') + 1) AS key, value FROM kv WHERE key LIKE ?").all(`${user.username}:%`) || []);
      });
    }

    if (pathname === "/api" && method === "DELETE") {
      return requireAuth((user) => {
        const key = new URL(req.url).searchParams.get("key");
        global.broadcast({ type: "delete", user: user.username, key });
        db.prepare("DELETE FROM kv WHERE key = ?").run(`${user.username}:${key}`);
        return Response.json({ deleted: true, key });
      });
    }

    if (pathname === "/files" && method === "POST") {
      try {
        const { contents = [] } = await r2.list();
        return Response.json(contents.map(({ key, size, lastModified }) => ({ key, size, lastModified })));
      } catch (e) {
        return Response.json({ error: "R2 operation failed", message: e.message }, { status: 503 });
      }
    }

    if (existsSync("public")) {
      const filePath = join(process.cwd(), "public", pathname === "/" ? "index.html" : pathname.slice(1));
      if (filePath.startsWith(join(process.cwd(), "public")) && existsSync(filePath)) {
        return new Response(Bun.file(filePath));
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server running on ${tls ? "https" : "http"}://localhost:3001`);
