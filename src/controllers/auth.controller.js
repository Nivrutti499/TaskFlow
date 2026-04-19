const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { registerSchema, loginSchema } = require('../validations/auth.schema');
const { signToken } = require('../utils/jwtHelper');

const prisma = new PrismaClient();

/**
 * Strips the password field from a user object before sending to client.
 */
const sanitizeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

/**
 * POST /api/auth/register
 * Register a new user account.
 */
const register = async (req, res) => {
  try {
    // Validate request body
    const parsed = registerSchema.safeParse(req.body);
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

    const { name, email, password } = parsed.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
        errors: [{ field: 'email', message: 'Email already in use' }],
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    // Sign token
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return res.status(201).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      errors: [],
    });
  }
};

/**
 * POST /api/auth/login
 * Login and receive a JWT token.
 */
const login = async (req, res) => {
  try {
    // Validate request body
    const parsed = loginSchema.safeParse(req.body);
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

    const { email, password } = parsed.data;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        errors: [],
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        errors: [],
      });
    }

    // Sign token
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      errors: [],
    });
  }
};

module.exports = { register, login };
