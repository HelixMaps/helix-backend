const { ClerkExpressRequireAuth } = require("@clerk/clerk-sdk-node");

// Express middleware that requires Clerk authentication
// It validates the Bearer token in the Authorization header.
// If valid, it attaches the auth details to `req.auth`.
// If invalid, it returns a 401 Unauthorized response or passes an error to the error handler.
const requireAuth = ClerkExpressRequireAuth();

module.exports = {
  requireAuth
};
