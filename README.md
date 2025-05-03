# Instaserve

Instant web stack for Node.js

## Usage

```bash
npx instaserve [options]
```

### Options

- `-port <number>` - Port to listen on (default: 3000)
- `-ip <address>` - IP address to bind to (default: 127.0.0.1)
- `-public <path>` - Public directory path (default: ./public)
- `-api <file>` - Path to routes file (default: ./routes.mjs)
- `-help` - Show help message

## Features

- Static file serving from public directory
- API routes with middleware support
- Automatic JSON parsing for POST requests
- Query string parameter support
- Directory traversal protection
- 404 handling for missing routes
- 500 error handling for server errors

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

## Security

- Directory traversal protection in URLs
- Directory traversal protection in public directory path
- Safe file serving from public directory only