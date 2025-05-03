<!DOCTYPE html>
<html>
<head>
    <title>Instaserve</title>
    <style>
        :root {
            --primary: #3b82f6;
            --primary-dark: #2563eb;
            --text: #1f2937;
            --text-light: #6b7280;
            --bg: #f9fafb;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.5;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px 15px;
            color: var(--text);
            background: var(--bg);
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .orb {
            width: 60px;
            height: 60px;
            background: radial-gradient(circle at 30% 30%, #60a5fa, var(--primary));
            border-radius: 50%;
            margin: 0 auto 10px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        h1 { 
            color: var(--primary);
            font-size: 2rem;
            margin: 0;
        }
        .subtitle {
            color: var(--text-light);
            font-size: 1rem;
            margin: 5px 0;
        }
        h2 { 
            color: var(--text);
            font-size: 1.3rem;
            margin: 20px 0 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid var(--primary);
        }
        h3 {
            color: var(--text);
            font-size: 1.1rem;
            margin: 15px 0 8px;
        }
        code {
            background: #f3f4f6;
            padding: 2px 4px;
            border-radius: 4px;
            font-family: 'SF Mono', Menlo, monospace;
            color: var(--primary-dark);
        }
        pre {
            background: #f3f4f6;
            padding: 10px;
            border-radius: 6px;
            overflow-x: auto;
            border: 1px solid #e5e7eb;
            margin: 10px 0;
            font-size: 0.9rem;
        }
        .option {
            margin: 8px 0;
            padding-left: 0;
            position: relative;
            display: flex;
            gap: 8px;
        }
        .option:before {
            display: none;
        }
        .option code {
            flex-shrink: 0;
        }
        ul {
            padding-left: 15px;
            margin: 8px 0;
        }
        li {
            margin: 5px 0;
        }
        .usage {
            background: white;
            padding: 15px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin: 15px 0;
        }
        p {
            margin: 8px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="orb"></div>
        <h1>Instaserve</h1>
        <p class="subtitle">Instant web stack for Node.js</p>
    </div>

    <div class="usage">
        <h2>Usage</h2>
        <pre><code>npx instaserve [options]</code></pre>
    </div>

    <h2>Options</h2>
    <div class="option"><code>-port &lt;number&gt;</code> - Port to listen on (default: 3000)</div>
    <div class="option"><code>-ip &lt;address&gt;</code> - IP address to bind to (default: 127.0.0.1)</div>
    <div class="option"><code>-public &lt;path&gt;</code> - Public directory path (default: ./public)</div>
    <div class="option"><code>-api &lt;file&gt;</code> - Path to routes file (default: ./routes.mjs)</div>
    <div class="option"><code>-help</code> - Show help message</div>

    <h2>Routes</h2>
    <p>The routes file (<code>routes.mjs</code> by default) defines your API endpoints. Each route is a function that handles requests to a specific URL path.</p>

    <h3>Basic Route Example</h3>
    <pre><code>export default {
    // Handle GET /hello
    hello: (req, res, data) => {
        return { message: 'Hello World' }
    }
}</code></pre>

    <h3>Special Routes (Middleware)</h3>
    <p>Routes starting with <code>_</code> are middleware functions that run on <strong>every request</strong> before the main route handler. They are useful for:</p>
    <ul>
        <li>Logging requests</li>
        <li>Authentication</li>
        <li>Request modification</li>
        <li>Response headers</li>
    </ul>
    <p>Middleware functions can:</p>
    <ul>
        <li>Return <code>false</code> to continue to the next middleware or main route</li>
        <li>Return a truthy value to stop processing and use that as the response</li>
        <li>Modify the request or response objects</li>
    </ul>

    <h4>Middleware Example</h4>
    <pre><code>export default {
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
}</code></pre>

    <h3>Route Parameters</h3>
    <p>Each route function receives:</p>
    <ul>
        <li><code>req</code> - The HTTP request object</li>
        <li><code>res</code> - The HTTP response object</li>
        <li><code>data</code> - Combined data from:
            <ul>
                <li>POST body (if JSON)</li>
                <li>URL query parameters</li>
                <li>Form data</li>
            </ul>
        </li>
    </ul>

    <h3>Example Routes File</h3>
    <pre><code>export default {
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
}</code></pre>
</body>
</html>
