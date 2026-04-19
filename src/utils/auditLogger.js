const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Creates an audit log entry for task actions.
 *
 * @param {object} options
 * @param {string} options.userId    - ID of the user performing the action
 * @param {string} [options.taskId] - ID of the affected task
 * @param {'CREATED'|'UPDATED'|'DELETED'} options.action - Action type
 * @param {object} [options.changes] - JSON object describing the changes (diff)
 */
const logAudit = async ({ userId, taskId = null, action, changes = null }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        taskId,
        action,
        changes,
      },
    });
  } catch (error) {
    console.error('Audit log creation failed:', error.message);
  }
};

/**
 * Computes a simple JSON diff between two objects.
 * Returns an object with `before` and `after` keys showing what changed.
 *
 * @param {object} before - Original object
 * @param {object} after  - Updated object
 * @returns {{ before: object, after: object }}
 */
const computeDiff = (before, after) => {
  const changedBefore = {};
  const changedAfter = {};

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    // Skip internal/system fields
    if (['id', 'createdAt', 'updatedAt'].includes(key)) continue;

    const bVal = JSON.stringify(before[key]);
    const aVal = JSON.stringify(after[key]);

    if (bVal !== aVal) {
      changedBefore[key] = before[key];
      changedAfter[key] = after[key];
    }
  }

  return { before: changedBefore, after: changedAfter };
};

module.exports = { logAudit, computeDiff };
