/*
 * This file defines the API routes and middleware for the Instaserve web server.
 * 
 * The file exports a default object containing route handlers and middleware functions.
 * 
 * Middleware functions (prefixed with _):
 * - _debug: Logs request method, URL and data to console
 * - _returnfalsy: Example middleware that returns true to stop request processing
 * - _example: Demonstrates middleware behavior with console log
 * - _end: Example of early response termination (commented out)
 * 
 * Route handlers:
 * - api: Returns a string response with the request data
 * - testerror: Throws an error for testing error handling
 * - testdata: Example route that returns the context parameter
 * 
 * Each route handler receives:
 * - req: HTTP request object
 * - s: HTTP response object
 * - data: Combined request data (POST body, query params, form data)
 */

export default {
    // Middleware functions (prefixed with _) run on every request
    // Return false to continue processing, or a value to use as response
    
    // Example: Log all requests
    _log: (req, res, data) => {
        console.log(`${req.method} ${req.url}`)
        return false // Continue to next middleware or route
    },

    // Example: Basic authentication
    _auth: (req, res, data) => {
        if (!data.token) {
            res.writeHead(401)
            return 'Unauthorized'
        }
        return false // Continue if authorized
    },

    // Regular route handlers
    hello: (req, res, data) => {
        return { message: 'Hello World' }
    },

    _debug: ({method, url}, s, data) => { console.log(method, url, data) },
    _example: (r, s) => console.log('in routes.mjs, returning a truthy value (above) will stop the chain'),
    _returnfalsy: (r, s) => { return true },

    api: (r, s, data) => 'an example api response, data:' + JSON.stringify(data),
    testerror: () => { throw new Error('this from testerror') },
    testdata: (r, s, c, d) => c
}