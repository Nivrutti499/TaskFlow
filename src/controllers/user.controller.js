const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { z } = require('zod');

const prisma = new PrismaClient();

/**
 * Strips the password field from a user object.
 */
const sanitizeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

/**
 * GET /api/users/me
 * Get the currently authenticated user's profile.
 */
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errors: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not retrieve user profile',
      errors: [],
    });
  }
};

/**
 * PATCH /api/users/me
 * Update the currently authenticated user's name or password.
 */
const updateMe = async (req, res) => {
  try {
    const updateSchema = z.object({
      name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100)
        .trim()
        .optional(),
      currentPassword: z.string().optional(),
      newPassword: z
        .string()
        .min(8, 'New password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain at least one uppercase, one lowercase, and one number'
        )
        .optional(),
    }).refine(
      (data) => {
        // If newPassword is provided, currentPassword must also be provided
        if (data.newPassword && !data.currentPassword) return false;
        return true;
      },
      { message: 'currentPassword is required when changing password', path: ['currentPassword'] }
    );

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { name, currentPassword, newPassword } = parsed.data;
    const updateData = {};

    if (name) updateData.name = name;

    if (newPassword) {
      // Verify current password
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
          errors: [{ field: 'currentPassword', message: 'Incorrect current password' }],
        });
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided to update',
        errors: [],
      });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: { user: updated },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not update user profile',
      errors: [],
    });
  }
};

/**
 * GET /api/users
 * Get all users. ADMIN and MANAGER only.
 */
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not retrieve users',
      errors: [],
    });
  }
};

/**
 * POST /api/users
 * Admin creates a new user with a specific role.
 */
const createUser = async (req, res) => {
  try {
    const schema = z.object({
      name:     z.string().min(2).max(100).trim(),
      email:    z.string().email(),
      password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must have upper, lower and number'),
      role:     z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    const { name, email, password, role } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use', errors: [{ field: 'email', message: 'Already registered' }] });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return res.status(201).json({ success: true, data: { user } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not create user', errors: [] });
  }
};

/**
 * PATCH /api/users/:id/role
 * Admin updates any user's role. Cannot change own role.
 */
const updateUserRole = async (req, res) => {
  try {
    const schema = z.object({ role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid role', errors: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot change your own role", errors: [] });
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found', errors: [] });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: parsed.data.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return res.status(200).json({ success: true, data: { user: updated } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not update role', errors: [] });
  }
};

/**
 * DELETE /api/users/:id
 * Admin deletes a user. Cannot delete self.
 */
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account", errors: [] });
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found', errors: [] });

    // Remove audit logs and unassign tasks first
    await prisma.auditLog.deleteMany({ where: { userId: req.params.id } });
    await prisma.task.updateMany({ where: { userId: req.params.id }, data: { userId: null } });
    await prisma.user.delete({ where: { id: req.params.id } });
    return res.status(200).json({ success: true, data: { message: `User "${user.name}" deleted.` } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not delete user', errors: [] });
  }
};

module.exports = { getMe, updateMe, getUsers, createUser, updateUserRole, deleteUser };
