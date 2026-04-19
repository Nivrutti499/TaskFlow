const { z } = require('zod');

/**
 * Zod schema for creating a task
 */
const createTaskSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters')
    .trim(),

  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .trim()
    .optional(),

  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH'], {
      errorMap: () => ({ message: 'Priority must be one of: LOW, MEDIUM, HIGH' }),
    })
    .optional()
    .default('MEDIUM'),

  dueDate: z
    .string()
    .datetime({ message: 'dueDate must be a valid ISO 8601 datetime string' })
    .optional()
    .or(z.literal(''))
    .transform((val) => (val ? new Date(val) : undefined)),

  assignedTo: z
    .string()
    .cuid({ message: 'assignedTo must be a valid user ID' })
    .optional(),
});

/**
 * Zod schema for updating a task
 */
const updateTaskSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters')
    .trim()
    .optional(),

  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .trim()
    .optional(),

  status: z
    .enum(['TODO', 'IN_PROGRESS', 'DONE'], {
      errorMap: () => ({ message: 'Status must be one of: TODO, IN_PROGRESS, DONE' }),
    })
    .optional(),

  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH'], {
      errorMap: () => ({ message: 'Priority must be one of: LOW, MEDIUM, HIGH' }),
    })
    .optional(),

  dueDate: z
    .string()
    .datetime({ message: 'dueDate must be a valid ISO 8601 datetime string' })
    .optional()
    .or(z.literal(''))
    .transform((val) => (val ? new Date(val) : undefined)),

  assignedTo: z
    .string()
    .cuid({ message: 'assignedTo must be a valid user ID' })
    .optional()
    .nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

/**
 * Zod schema for task query filters
 */
const taskQuerySchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  assignedTo: z.string().cuid().optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default('10'),
});

module.exports = { createTaskSchema, updateTaskSchema, taskQuerySchema };
