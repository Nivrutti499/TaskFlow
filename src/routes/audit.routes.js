const express = require('express');
const { getAuditLogs } = require('../controllers/audit.controller');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');

const router = express.Router();

// All audit routes require authentication + ADMIN role
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Audit log endpoints (ADMIN only)
 */

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Get paginated audit logs (ADMIN only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Records per page (max 100)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *         description: Filter by task ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [CREATED, UPDATED, DELETED]
 *         description: Filter by action type
 *     responses:
 *       200:
 *         description: Paginated list of audit log entries
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
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 */
router.get('/', authorizeRole('ADMIN'), getAuditLogs);

module.exports = router;
