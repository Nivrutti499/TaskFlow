const express = require('express');
const { getMe, updateMe, getUsers, createUser, updateUserRole, deleteUser } = require('../controllers/user.controller');

const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// ADMIN + MANAGER: list all users (for assignee dropdowns)
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied', errors: [] });
  }
  next();
};

router.get('/', authorize('ADMIN', 'MANAGER'), getUsers);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/me', getMe);

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     summary: Update current user profile (name or password)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               currentPassword:
 *                 type: string
 *                 example: "OldPass@1"
 *               newPassword:
 *                 type: string
 *                 example: "NewPass@1"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error or incorrect current password
 *       401:
 *         description: Unauthorized
 */
router.patch('/me', updateMe);

// ADMIN only: create user with role, change role, delete user
router.post('/',            authorize('ADMIN'), createUser);
router.patch('/:id/role',  authorize('ADMIN'), updateUserRole);
router.delete('/:id',      authorize('ADMIN'), deleteUser);

module.exports = router;
