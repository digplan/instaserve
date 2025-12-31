import crypto from 'crypto';

const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = process.env;
if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
  console.warn("Auth0 environment variables not set! Please set AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET.");
}

/**
 * Auth0 Authentication Module
 * 
 * Usage:
 * 1. Import this module in your routes.js file.
 * 2. Merge it into your default export routes object: `...auth0`.
 * 3. Ensure AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET are set in environment variables.
 * 4. Ensure `global.sqlite` is initialized (typically by importing lib/sqlite.js).
 * 5. CLIENT_HOME cookie is set to the client's home URL.
 * 
 * Routes provided:
 * - GET /login: Initiates Auth0 login flow.
 * - GET /logout: Clears session and token.
 * - GET /callback: Handles Auth0 callback, validates token, creates user in DB.
 */

export default {
  "GET /login": (req, res) => {
    const REDIRECT_URI = `https://${req.headers.host}/callback`;
    const state = crypto.randomBytes(16).toString("hex");
    global.a0state = state;
    const url = `https://${AUTH0_DOMAIN}/authorize?response_type=code&client_id=${AUTH0_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email&state=${encodeURIComponent(state)}`;
    res.writeHead(302, { Location: url });
    res.end();
  },
  "GET /logout": (req, res, data) => {
    const token = req.headers.cookie?.match(/token=([^;]+)/)?.[1];
    if (token) {
      global.sqlite.prepare("UPDATE users SET token = NULL WHERE token = ?").run(token);
    }
    res.setHeader("Set-Cookie", "token=; Path=/; HttpOnly; Secure; SameSite=Strict");
    res.setHeader("Set-Cookie", "loggedIn=false; Path=/");
    res.write("logged out");
    res.end();
  },
  "GET /callback": async (req, res, data) => {
    const CLIENT_HOME = req.headers.cookie.match(/home=([^;]+)/)?.[1];
    const REDIRECT_URI = `https://${req.headers.host}/callback`;
    const tokenRes = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        code: data.code,
        redirect_uri: REDIRECT_URI
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error || !tokens.id_token) {
      console.error("Auth0 Error:", tokens);
      return `Auth0 Error: ${tokens.error_description || tokens.error || "Unknown error"}`;
    }

    // decrypt token
    const id_token = tokens.id_token;
    const payload = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString());
    const auth_token = crypto.randomBytes(32).toString("hex");
    global.sqlite.prepare("INSERT INTO users (id, username, token) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET token = ?, name = ?, picture = ?")
      .run(payload.email, payload.name, auth_token, auth_token, payload.name, payload.picture);

    res.setHeader("Set-Cookie", [
      `token=${auth_token}; Domain=localhost; Path=/; HttpOnly`,
      `username=${payload.email}; Domain=localhost; Path=/;`,
      `name=${payload.name}; Domain=localhost; Path=/;`,
      `pic=${payload.picture}; Domain=localhost; Path=/;`,
      `loggedIn=true; Domain=localhost; Path=/;`
    ]);

    return `<script>window.location.href = '${CLIENT_HOME}';</script>`;
  }
}