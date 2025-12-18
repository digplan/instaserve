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
    hello: (req, res, data) => {
        return { message: 'Hello World' }
    },

    api: (req, res, data) => {
        return { message: 'API endpoint', data }
    }
}
