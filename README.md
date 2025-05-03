# Instaserve

<div align="center">
  <img style="width: 60px;height: 60px;background: radial-gradient(circle at 30% 30%, #60a5fa, var(--primary));border-radius: 50%;margin: 0 auto 10px;box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);" />
  <h1 style="color: #3b82f6; margin: 10px 0 5px;">Instaserve</h1>
  <p style="color: #6b7280; margin: 0;">Instant web stack for Node.js</p>
</div>

## Usage

<div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); margin: 15px 0;">
  <pre style="margin: 0;"><code>npx instaserve [options]</code></pre>
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
  <span>Path to routes file (default: ./routes.mjs)</span>
</div>

<div style="display: flex; gap: 8px; margin: 8px 0;">
  <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 4px; color: #2563eb;">-help</code>
  <span>Show help message</span>
</div>

## Routes

The routes file (`routes.mjs` by default) defines your API endpoints. Each route is a function that handles requests to a specific URL path.

### Basic Route Example

```javascript
export default {
    // Handle GET /hello
    hello: (req, res, data) => {
        return { message: 'Hello World' }
    }
}
```

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

### Example Routes File

```javascript
export default {
    // Middleware example
    _debug: (req, res, data) => {
        console.log('Request:', req.url)
        return false // Continue to next route
    },

    // API endpoint
    api: (req, res, data) => {
        return { status: 'ok', data }
    },

    // Error handling
    testerror: () => {
        throw new Error('Test error')
    }
}
```
