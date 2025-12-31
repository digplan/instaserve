import crypto from "crypto";

const auth0_domain = process.env.AUTH0_DOMAIN || process.env.auth0_domain;
const auth0_clientid = process.env.AUTH0_CLIENT_ID || process.env.auth0_clientid;
const auth0_clientsecret = process.env.AUTH0_CLIENT_SECRET || process.env.auth0_clientsecret;

const LOGGEDIN_REDIRECT = "https://localhost:3000/";

if (!auth0_domain || !auth0_clientid || !auth0_clientsecret) {
  console.warn("Auth0 environment variables not set! Please set AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET.");
}

/**
 * Auth0 Authentication Module
 * 
 * Usage:
 * 1. Import this module in your routes.js file.
 * 2. Merge it into your default export routes object: `...auth0`.
 * 3. Ensure 'secrets' is globally available or imported with `auth0_domain`, `auth0_clientid`, and `auth0_clientsecret`.
 * 4. Ensure `global.sqlite` is initialized (typically by importing lib/sqlite.js).
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
    const url = `https://${auth0_domain}/authorize?response_type=code&client_id=${auth0_clientid}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email&state=${encodeURIComponent(state)}`;
    res.writeHead(302, { Location: url });
    res.end();
  },
  "GET /logout": (req, res, data) => {
    const token = req.headers.cookie?.match(/token=([^;]+)/)?.[1];
    console.log(`logout: ${token}`);
    if (token) {
      global.sqlite.prepare("UPDATE users SET token = NULL WHERE token = ?").run(token);
    }
    res.setHeader("Set-Cookie", "token=; Path=/; HttpOnly; Secure; SameSite=Strict");
    res.setHeader("Set-Cookie", "loggedIn=false; Path=/");

    res.write("logged out");
    res.end();
  },
  "GET /callback": async (req, res, data) => {
    const REDIRECT_URI = `https://${req.headers.host}/callback`;
    const tokenRes = await fetch(`https://${auth0_domain}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: auth0_clientid,
        client_secret: auth0_clientsecret,
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

    // Fix: Set multiple cookies using an array
    res.setHeader("Set-Cookie", [
      `username=${payload.email}; Domain=localhost; Path=/;`,
      `name=${payload.name}; Domain=localhost; Path=/;`,
      `token=${auth_token}; Domain=localhost; Path=/; HttpOnly`
    ]);

    // Fix: Set localStorage for client-side UI and redirect
    return `
    <html>
    <body>
    <script>
      // Set client-side cookies (optional, but good for non-HttpOnly access if needed)
      document.cookie = "username=${payload.email}; path=/; max-age=3600; Secure; SameSite=None";
      document.cookie = "name=${payload.name}; path=/; max-age=3600; Secure; SameSite=None";
      document.cookie = "loggedIn=true; path=/";
      
      // Set localStorage for index.html Profile View
      localStorage.setItem('name', '${payload.name}');
      localStorage.setItem('pic', '${payload.picture}');
      
      window.location.href = '${LOGGEDIN_REDIRECT}';
    </script>
    </body>
    </html>`;
  }
}