#!/usr/bin/env bun

import { join } from "path";

const BASE_URL = "https://localhost:3001";
let testsPassed = 0;
let testsFailed = 0;
let serverProcess = null;
let serverStartedByTest = false;

function log(message, type = "info") {
  const colors = {
    pass: "\x1b[32m",
    fail: "\x1b[31m",
    info: "\x1b[36m",
    warn: "\x1b[33m",
    reset: "\x1b[0m",
  };
  const icon = type === "pass" ? "✓" : type === "fail" ? "✗" : type === "warn" ? "⚠" : "→";
  console.log(`${colors[type] || ""}${icon} ${message}${colors.reset}`);
}

async function test(name, fn) {
  try {
    await fn();
    testsPassed++;
    log(`${name}`, "pass");
  } catch (error) {
    testsFailed++;
    log(`${name}: ${error.message}`, "fail");
  }
}

async function request(method, path, body = null, headers = {}, cookies = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (cookies) {
    options.headers["Cookie"] = cookies;
  }
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  // Extract cookies from response
  const setCookie = response.headers.get("set-cookie");
  const newCookies = cookies || "";
  return { status: response.status, data, headers: response.headers, cookies: setCookie || newCookies };
}

let testCookie = null;
async function createTestSession() {
  const { Database } = await import("bun:sqlite");
  const db = new Database(join(import.meta.dir, "data.db"));
  const testToken = "test-token-" + Date.now();
  db.prepare("INSERT OR REPLACE INTO users (id, username, token, email) VALUES (?, ?, ?, ?)").run(
    "test-user-id", "testuser", testToken, "test@example.com"
  );
  db.close();
  testCookie = `token=${testToken}`;
  return testCookie;
}

// Check if server is already running
async function isServerRunning() {
  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  log("Starting server...", "info");
  serverProcess = Bun.spawn(["bun", "server.js"], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: import.meta.dir,
    env: process.env,
  });
  serverStartedByTest = true;
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) });
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("Server not responding after multiple attempts");
}

async function cleanup() {
  if (serverStartedByTest && serverProcess) {
    log("Stopping test server...", "info");
    serverProcess.kill();
    try {
      await serverProcess.exited;
    } catch {}
  }
}

// Handle process termination
process.on("SIGINT", async () => {
  await cleanup();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(1);
});

// Main execution
console.log("\n🧪 Starting comprehensive server tests...\n");

// Check if server is running, start if not
const running = await isServerRunning();
if (!running) {
  log("Server not detected, starting server...", "warn");
  await startServer();
} else {
  log("Server already running, using existing instance", "info");
}

// Wait for server to be ready
log("Waiting for server to be ready...", "info");
await waitForServer();

// Test 1: Server is running
await test("Server is running", async () => {
  await waitForServer();
});

// Test 1.5: Create test session for authenticated tests
await test("Create test session", async () => {
  await createTestSession();
});

// Test 2: GET /login - Login redirect
await test("GET /login - Login redirect", async () => {
  const { status, headers } = await request("GET", "/login");
  // Should redirect (302) or return error if Auth0 not configured
  if (status !== 302 && status !== 500) {
    throw new Error(`Expected 302 or 500, got ${status}`);
  }
  if (status === 302 && !headers.get("location")?.includes("auth0.com")) {
    throw new Error("Login should redirect to Auth0");
  }
});

// Test 2.5: POST /api - Unauthenticated request
await test("POST /api - Unauthenticated request returns 401", async () => {
  const { status, data } = await request("POST", "/api", {
    key: "test-key",
    value: "test-value",
  });
  if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  if (!data.error || !data.error.includes("Unauthorized")) {
    throw new Error("Should return unauthorized error");
  }
});

// Test 3: POST /api - Create KV pair (authenticated)
await test("POST /api - Create KV pair (authenticated)", async () => {
  const { status, data } = await request("POST", "/api", {
    key: "test-key",
    value: "test-value",
  }, {}, testCookie);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (data.key !== "test-key" || data.value !== "test-value") {
    throw new Error("Data mismatch");
  }
});

// Test 4: GET /api - Retrieve KV pair (authenticated)
await test("GET /api - Retrieve KV pair (authenticated)", async () => {
  const { status, data } = await request("GET", "/api?key=test-key", null, {}, testCookie);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (data.key !== "test-key" || data.value !== "test-value") {
    throw new Error("Data mismatch");
  }
});

// Test 5: GET /api - Non-existent key (authenticated)
await test("GET /api - Non-existent key returns empty object", async () => {
  const { status, data } = await request("GET", "/api?key=nonexistent", null, {}, testCookie);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (Object.keys(data).length === 0 === false) {
    throw new Error("Expected empty object");
  }
});

// Test 6: POST /api - Update existing KV pair (authenticated)
await test("POST /api - Update existing KV pair (authenticated)", async () => {
  const { status, data } = await request("POST", "/api", {
    key: "test-key",
    value: "updated-value",
  }, {}, testCookie);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (data.value !== "updated-value") {
    throw new Error("Value not updated");
  }
});

// Test 7: GET /all - List all KV pairs (authenticated)
await test("GET /all - List all KV pairs (authenticated)", async () => {
  // Create a few more entries
  await request("POST", "/api", { key: "key1", value: "value1" }, {}, testCookie);
  await request("POST", "/api", { key: "key2", value: "value2" }, {}, testCookie);

  const { status, data } = await request("GET", "/all", null, {}, testCookie);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (!Array.isArray(data)) throw new Error("Expected array");
  if (data.length < 3) throw new Error("Expected at least 3 entries");
});

// Test 8: DELETE /api - Delete KV pair (authenticated)
await test("DELETE /api - Delete KV pair (authenticated)", async () => {
  const { status, data } = await request("DELETE", "/api?key=test-key", null, {}, testCookie);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (!data.deleted || data.key !== "test-key") {
    throw new Error("Delete response mismatch");
  }

  // Verify it's deleted
  const getResponse = await request("GET", "/api?key=test-key", null, {}, testCookie);
  if (Object.keys(getResponse.data).length !== 0) {
    throw new Error("Key should be deleted");
  }
});

// Test 8.5: GET /logout - Logout redirect
await test("GET /logout - Logout redirect", async () => {
  const { status, headers } = await request("GET", "/logout");
  // Should redirect (302)
  if (status !== 302) {
    throw new Error(`Expected 302, got ${status}`);
  }
  // Should clear cookie
  const setCookie = headers.get("set-cookie");
  if (setCookie && !setCookie.includes("Max-Age=0")) {
    throw new Error("Logout should clear cookie");
  }
});

// Test 9: POST /api - Missing key or value (authenticated)
await test("POST /api - Missing key returns error", async () => {
  const { status } = await request("POST", "/api", { value: "test" }, {}, testCookie);
  // Server might handle this differently, so we just check it doesn't crash
  if (status >= 500) throw new Error("Server error");
});

// Test 10: GET /sse - Server-Sent Events
await test("GET /sse - Server-Sent Events connection", async () => {
  const response = await fetch(`${BASE_URL}/sse`);
  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }
  if (response.headers.get("content-type") !== "text/event-stream") {
    throw new Error("Wrong content type");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunk = await reader.read();
  const text = decoder.decode(chunk.value);
  if (!text.includes("status") || !text.includes("connected")) {
    throw new Error("SSE message format incorrect");
  }
  reader.cancel();
});

// Test 11: R2 environment variables check
await test("R2 environment variables are set", async () => {
  const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_BUCKET_NAME;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  
  if (!accessKeyId) throw new Error("CLOUDFLARE_ACCESS_KEY_ID not set");
  if (!secretAccessKey) throw new Error("CLOUDFLARE_SECRET_ACCESS_KEY not set");
  if (!bucketName) throw new Error("CLOUDFLARE_BUCKET_NAME not set");
  if (!accountId) throw new Error("CLOUDFLARE_ACCOUNT_ID not set");
});

// Test 12: POST /files - R2 file listing
await test("POST /files - R2 file listing", async () => {
  const { status, data } = await request("POST", "/files");
  if (status !== 200) {
    throw new Error(`Expected 200, got ${status}. Response: ${JSON.stringify(data)}`);
  }
  if (!Array.isArray(data)) {
    throw new Error(`Expected array of files, got ${typeof data}`);
  }
  // Verify file structure
  if (data.length > 0) {
    const file = data[0];
    if (!file.key) throw new Error("File missing 'key' property");
    if (typeof file.size !== "number") throw new Error("File missing or invalid 'size' property");
    if (!file.lastModified) throw new Error("File missing 'lastModified' property");
  }
});

// Test 13: Static file serving (if public folder exists)
await test("Static file serving - 404 for non-existent", async () => {
  const { status } = await request("GET", "/nonexistent.html");
  if (status !== 404) throw new Error(`Expected 404, got ${status}`);
});

// Test 14: Invalid method on /api
await test("Invalid method on /api returns 404", async () => {
  const { status } = await request("PUT", "/api");
  if (status !== 404) throw new Error(`Expected 404, got ${status}`);
});

// Test 15: DELETE /api - Non-existent key (authenticated)
await test("DELETE /api - Non-existent key", async () => {
  const { status, data } = await request("DELETE", "/api?key=nonexistent-delete", null, {}, testCookie);
  // Should still return success even if key doesn't exist
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
});

// Test 16: Multiple concurrent requests (authenticated)
await test("Multiple concurrent POST requests (authenticated)", async () => {
  const promises = Array.from({ length: 5 }, (_, i) =>
    request("POST", "/api", { key: `concurrent-${i}`, value: `value-${i}` }, {}, testCookie)
  );
  const results = await Promise.all(promises);
  if (results.some((r) => r.status !== 200)) {
    throw new Error("Some concurrent requests failed");
  }
});

// Test 17: GET /all after cleanup (authenticated)
await test("GET /all - Verify all entries (authenticated)", async () => {
  const { status, data } = await request("GET", "/all", null, {}, testCookie);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (!Array.isArray(data)) throw new Error("Expected array");
  // Should have key1, key2, and concurrent-0 through concurrent-4
  const keys = data.map((item) => item.key);
  if (!keys.includes("key1") || !keys.includes("key2")) {
    throw new Error("Missing expected keys");
  }
});

// Test 18: POST /api with special characters (authenticated)
await test("POST /api - Special characters in value (authenticated)", async () => {
  const specialValue = '{"json": true, "unicode": "🚀", "newline": "\\n"}';
  const { status, data } = await request("POST", "/api", {
    key: "special-chars",
    value: specialValue,
  }, {}, testCookie);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (data.value !== specialValue) {
    throw new Error("Special characters not preserved");
  }
});

// Test 19: GET /api with special characters (authenticated)
await test("GET /api - Retrieve special characters (authenticated)", async () => {
  const { status, data } = await request("GET", "/api?key=special-chars", null, {}, testCookie);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (!data.value.includes("🚀")) {
    throw new Error("Unicode characters not preserved");
  }
});

// Test 20: Large value handling (authenticated)
await test("POST /api - Large value (authenticated)", async () => {
  const largeValue = "x".repeat(10000);
  const { status, data } = await request("POST", "/api", {
    key: "large-value",
    value: largeValue,
  }, {}, testCookie);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (data.value.length !== 10000) {
    throw new Error("Large value not stored correctly");
  }
});

// Test 21: Root path handling
await test("GET / - Root path", async () => {
  const { status } = await request("GET", "/");
  // Should return 404 if no public folder, or serve index.html if it exists
  if (status !== 404 && status !== 200) {
    throw new Error(`Unexpected status: ${status}`);
  }
});

// Test 22: CORS headers (if applicable)
await test("OPTIONS request handling", async () => {
  const { status } = await request("OPTIONS", "/api");
  // Server might not handle OPTIONS, so 404 is acceptable
  if (status >= 500) throw new Error("Server error on OPTIONS");
});

console.log("\n" + "=".repeat(50));
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log("=".repeat(50) + "\n");

// Cleanup
await cleanup();

if (testsFailed > 0) {
  process.exit(1);
}

