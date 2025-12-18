<div align="center">
  <h1 style="color: #3b82f6; margin: 10px 0 5px;">Instaserve</h1>
  <p style="color: #6b7280; margin: 0;">Instant web stack for Node.js</p>
  
  <p>
    <img src="https://img.shields.io/npm/v/instaserve" alt="npm version" />
    <img src="https://img.shields.io/bundlephobia/minzip/instaserve" alt="bundle size" />
  </p>
</div>

## Usage

<div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); margin: 15px 0;">
  <pre style="margin: 0;"><code>npx instaserve [options]
npx instaserve generate-routes</code></pre>
</div>

## Commands

<div style="display: flex; gap: 8px; margin: 8px 0;">
  <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 4px; color: #2563eb;">generate-routes</code>
  <span>Create a sample routes.js file in the current directory</span>
</div>

## Options

<div style="display: flex; gap: 8px; margin: 8px 0;">
  <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 4px; color: #2563eb;">-port &lt;number&gt;</code>
  <span>Port to listen on (default: 3000)</span>
</div>

<div style="display: flex; gap: 8px; margin: 8px 0;">
  <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 4px; color: #2563eb;">-ip &lt;address&gt;</code>
  <span>IP address to bind to (default: 127.0.0.1)</span>
</div>

<div style="display: flex; gap: 8px; margin: 8px 0;">
  <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 4px; color: #2563eb;">-public &lt;path&gt;</code>
  <span>Public directory path (default: ./public)</span>
</div>

<div style="display: flex; gap: 8px; margin: 8px 0;">
  <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 4px; color: #2563eb;">-api &lt;file&gt;</code>
  <span>Path to routes file (default: ./routes.js)</span>
</div>

<div style="display: flex; gap: 8px; margin: 8px 0;">
  <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 4px; color: #2563eb;">-secure</code>
  <span>Enable HTTPS (requires cert.pem and key.pem - run ./generate-certs.sh)</span>
</div>

<div style="display: flex; gap: 8px; margin: 8px 0;">
  <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 4px; color: #2563eb;">-help</code>
  <span>Show help message</span>
</div>

## HTTPS Support

Instaserve supports HTTPS with self-signed certificates. To enable HTTPS:

1. **Generate certificates:**
   ```bash
   ./generate-certs.sh
   ```
   This creates `cert.pem` and `key.pem` files and adds them to your system's trust store.

2. **Run with HTTPS:**
   ```bash
   npx instaserve -secure
   ```

The certificate generation script:
- Creates a self-signed certificate valid for 365 days
- Automatically adds the certificate to your system trust store (macOS/Linux)
- Prevents browser security warnings

## Routes

The routes file (`routes.js` by default) defines your API endpoints. Each route is a function that handles requests to a specific URL path.

### Generating a Routes File

To create a sample `routes.js` file with example routes and middleware:

```bash
npx instaserve generate-routes
```

This creates a `routes.js` file in the current directory with example code. If the file already exists, the command will fail to prevent overwriting.

### Routes File Validation

Instaserve validates routes files on startup:
- If `-api` is specified and the file doesn't exist, the server will fail to start
- The routes file must export a default object
- All route handlers must be functions
- Invalid routes files will cause the server to exit with an error message

### Basic Route Example

```javascript
export default {
    // Handle GET /hello
    hello: (req, res, data) => {
        return { message: 'Hello World' }
    }
}
```

### Method-Specific Routes

Routes can be defined with HTTP method prefixes to handle different methods on the same path. Supported methods: `GET`, `POST`, `PUT`, `DELETE`.

```javascript
export default {
    // Method-specific routes
    'POST /users': (req, res, data) => {
        return { message: 'Create user', data }
    },
    
    'GET /users': (req, res, data) => {
        return { message: 'Get users' }
    },
    
    'PUT /users': (req, res, data) => {
        return { message: 'Update user', data }
    },
    
    'DELETE /users': (req, res, data) => {
        return { message: 'Delete user', data }
    },
    
    // Path-only routes still work (backward compatible)
    // These match any HTTP method
    hello: (req, res, data) => {
        return { message: 'Hello World' }
    }
}
```

Method-specific routes take precedence over path-only routes. If no method-specific route matches, the server falls back to path-only route matching.

### Special Routes (Middleware)

Routes starting with `_` are middleware functions that run on **every request** before the main route handler. They are useful for:

- Logging requests
- Authentication
- Request modification
- Response headers

Middleware functions can:
- Return `false` to continue to the next middleware or main route
- Return a truthy value to stop processing and use that as the response
- Modify the request or response objects

#### Middleware Example

```javascript
export default {
    // Log every request
    _log: (req, res, data) => {
        console.log(`${req.method} ${req.url}`)
        return false // Continue processing
    },

    // Block unauthorized requests
    _auth: (req, res, data) => {
        if (!data.token) {
            res.writeHead(401)
            return 'Unauthorized'
        }
        return false // Continue if authorized
    }
}
```

### Route Parameters

Each route function receives:
- `req` - The HTTP request object
- `res` - The HTTP response object
- `data` - Combined data from:
  - POST body (if JSON)
  - URL query parameters
  - Form data

### Returning Status Codes

Routes can return a 3-digit number (100-999) to set the HTTP status code with an empty response body:

```javascript
export default {
    'GET /notfound': () => 404,
    'GET /unauthorized': () => 401,
    'GET /forbidden': () => 403,
    'GET /teapot': () => 418, // I'm a teapot
    'GET /created': () => 201
}
```

Routes can also return:
- **Strings** - Sent as plain text response
- **Objects** - Automatically serialized as JSON
- **Status codes** - 3-digit numbers (100-999) set HTTP status with empty body

### Example Routes File

```javascript
// routes.js
export default {
    // Middleware example
    _debug: (req, res, data) => {
        console.log('Request:', req.url)
        return false // Continue to next route
    },

    // Method-specific routes
    'POST /api/users': (req, res, data) => {
        return { status: 'created', data }
    },
    
    'GET /api/users': (req, res, data) => {
        return { status: 'ok', users: [] }
    },
    
    'GET /api/notfound': () => 404,
    'GET /api/unauthorized': () => 401,

    // Path-only route (matches any method)
    api: (req, res, data) => {
        return { status: 'ok', data }
    },

    // Error handling
    testerror: () => {
        throw new Error('Test error')
    }
}
```
