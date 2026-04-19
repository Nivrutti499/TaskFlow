const { PrismaClient } = require('@prisma/client');
const { createTaskSchema, updateTaskSchema, taskQuerySchema } = require('../validations/task.schema');
const { logAudit, computeDiff } = require('../utils/auditLogger');

const prisma = new PrismaClient();

// Fields to always select (never return raw passwords via joins)
const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  assignedTo: {
    select: { id: true, name: true, email: true, role: true },
  },
};

/**
 * POST /api/tasks
 * Create a new task. ADMIN and MANAGER only.
 */
const createTask = async (req, res) => {
  try {
    const parsed = createTaskSchema.safeParse(req.body);
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

    const { title, description, priority, dueDate, assignedTo } = parsed.data;

    // Validate assignedTo user exists
    if (assignedTo) {
      const assignee = await prisma.user.findUnique({ where: { id: assignedTo } });
      if (!assignee) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found',
          errors: [{ field: 'assignedTo', message: 'User does not exist' }],
        });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        dueDate,
        ...(assignedTo && { userId: assignedTo }),
      },
      select: taskSelect,
    });

    // Log audit
    await logAudit({
      userId: req.user.id,
      taskId: task.id,
      action: 'CREATED',
      changes: { title, priority, status: 'TODO', assignedTo: assignedTo || null },
    });

    return res.status(201).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    console.error('createTask error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not create task',
      errors: [],
    });
  }
};

/**
 * GET /api/tasks
 * List tasks with optional filters and pagination.
 * EMPLOYEE can only see tasks assigned to them.
 */
const getTasks = async (req, res) => {
  try {
    const parsed = taskQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { status, priority, assignedTo, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    // EMPLOYEE can only see their own tasks
    if (req.user.role === 'EMPLOYEE') {
      where.userId = req.user.id;
    } else if (assignedTo) {
      where.userId = assignedTo;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        select: taskSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('getTasks error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not retrieve tasks',
      errors: [],
    });
  }
};

/**
 * GET /api/tasks/:id
 * Get a single task by ID.
 * EMPLOYEE can only access their own tasks.
 */
const getTaskById = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      select: taskSelect,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        errors: [],
      });
    }

    // EMPLOYEE access control
    if (req.user.role === 'EMPLOYEE' && task.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this task',
        errors: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not retrieve task',
      errors: [],
    });
  }
};

/**
 * PATCH /api/tasks/:id
 * Update a task. EMPLOYEE can only update status of tasks assigned to them.
 */
const updateTask = async (req, res) => {
  try {
    const parsed = updateTaskSchema.safeParse(req.body);
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

    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        errors: [],
      });
    }

    // EMPLOYEE access control: only their tasks, only status changes
    if (req.user.role === 'EMPLOYEE') {
      if (existing.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update tasks assigned to you',
          errors: [],
        });
      }
      // Employee can only change status
      const allowedKeys = ['status'];
      const attemptedKeys = Object.keys(parsed.data);
      const forbidden = attemptedKeys.filter((k) => !allowedKeys.includes(k));
      if (forbidden.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Employees can only update the status field. Forbidden fields: ${forbidden.join(', ')}`,
          errors: [],
        });
      }
    }

    const { title, description, status, priority, dueDate, assignedTo } = parsed.data;

    // Validate new assignee exists
    if (assignedTo) {
      const assignee = await prisma.user.findUnique({ where: { id: assignedTo } });
      if (!assignee) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found',
          errors: [{ field: 'assignedTo', message: 'User does not exist' }],
        });
      }
    }

    const updateData = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(dueDate !== undefined && { dueDate }),
      ...(assignedTo !== undefined && { userId: assignedTo }),
    };

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      select: taskSelect,
    });

    // Compute diff and log
    const diff = computeDiff(existing, { ...existing, ...updateData });
    await logAudit({
      userId: req.user.id,
      taskId: updated.id,
      action: 'UPDATED',
      changes: diff,
    });

    return res.status(200).json({
      success: true,
      data: { task: updated },
    });
  } catch (error) {
    console.error('updateTask error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not update task',
      errors: [],
    });
  }
};

/**
 * DELETE /api/tasks/:id
 * Delete a task. ADMIN and MANAGER only.
 */
const deleteTask = async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        errors: [],
      });
    }

    // Log before delete (taskId will become orphaned after deletion, store title)
    await logAudit({
      userId: req.user.id,
      taskId: existing.id,
      action: 'DELETED',
      changes: {
        title: existing.title,
        status: existing.status,
        priority: existing.priority,
      },
    });

    // Delete audit logs referencing this task first to avoid FK issues
    await prisma.auditLog.deleteMany({ where: { taskId: existing.id } });
    await prisma.task.delete({ where: { id: req.params.id } });

    return res.status(200).json({
      success: true,
      data: { message: `Task "${existing.title}" deleted successfully` },
    });
  } catch (error) {
    console.error('deleteTask error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not delete task',
      errors: [],
    });
  }
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask };
