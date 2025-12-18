export default {
  // Middleware functions (prefixed with _) run on every request
  // Return false to continue processing, or a value to use as response

  // Example: Log all requests
  _log: (req, res, data) => {
    console.log(`${req.method} ${req.url}`)
    return false // Continue to next middleware or route
  },

  // Example: Basic authentication (commented out)
  // _auth: (req, res, data) => {
  //     if (!data.token) {
  //         res.writeHead(401)
  //         return 'Unauthorized'
  //     }
  //     return false // Continue if authorized
  // },

  // Regular route handlers
  hello: async (req, res, data) => {
    await new Promise(r => setTimeout(r, 2000));
    res.setHeader('some', 'head')
    return { message: 'Hello World' }
  },

  api: (req, res, data) => {
    return { message: 'API endpoint', data }
  },

  example429: (req, res, data) => {
    return 429; // This will return a status code 429
  },

  "POST /examplepost": (req, res, data) => {
    return { message: 'Example POST endpoint', data }
  }
}
