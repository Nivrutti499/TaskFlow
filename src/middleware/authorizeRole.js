/**
 * RBAC middleware factory.
 * Usage: authorizeRole('ADMIN', 'MANAGER')
 *
 * Role hierarchy:
 *   ADMIN    → full access to everything
 *   MANAGER  → can create/assign/update tasks for their team
 *   EMPLOYEE → can only view and update tasks assigned to them
 */
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        errors: [],
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
        errors: [],
      });
    }

    next();
  };
};

module.exports = authorizeRole;
