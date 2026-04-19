const { verifyToken } = require('../utils/jwtHelper');

/**
 * Middleware to verify JWT and attach user to request.
 * Sends 401 if token is missing or invalid.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
      errors: [],
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      errors: [],
    });
  }

  req.user = decoded; // { id, email, role }
  next();
};

module.exports = authenticateToken;
