const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data in correct order (respect FK constraints)
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  const saltRounds = 10;

  // Create ADMIN
  const adminPassword = await bcrypt.hash('Admin@1234', saltRounds);
  const admin = await prisma.user.create({
    data: {
      name: 'Alice Admin',
      email: 'admin@taskflow.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Created ADMIN: ${admin.email}`);

  // Create MANAGERs
  const manager1Password = await bcrypt.hash('Manager@1234', saltRounds);
  const manager1 = await prisma.user.create({
    data: {
      name: 'Bob Manager',
      email: 'manager1@taskflow.com',
      password: manager1Password,
      role: 'MANAGER',
    },
  });

  const manager2Password = await bcrypt.hash('Manager@5678', saltRounds);
  const manager2 = await prisma.user.create({
    data: {
      name: 'Carol Manager',
      email: 'manager2@taskflow.com',
      password: manager2Password,
      role: 'MANAGER',
    },
  });
  console.log(`✅ Created MANAGERs: ${manager1.email}, ${manager2.email}`);

  // Create EMPLOYEEs
  const employeeData = [
    { name: 'Dave Employee', email: 'employee1@taskflow.com', password: 'Emp@1111' },
    { name: 'Eve Employee',  email: 'employee2@taskflow.com', password: 'Emp@2222' },
    { name: 'Frank Employee',email: 'employee3@taskflow.com', password: 'Emp@3333' },
    { name: 'Grace Employee',email: 'employee4@taskflow.com', password: 'Emp@4444' },
    { name: 'Hank Employee', email: 'employee5@taskflow.com', password: 'Emp@5555' },
  ];

  const employees = await Promise.all(
    employeeData.map(async (e) => {
      const hashed = await bcrypt.hash(e.password, saltRounds);
      return prisma.user.create({
        data: { name: e.name, email: e.email, password: hashed, role: 'EMPLOYEE' },
      });
    })
  );
  console.log(`✅ Created 5 EMPLOYEEs`);

  // Create 10 sample Tasks
  const taskData = [
    {
      title: 'Design system architecture',
      description: 'Create a high-level architecture diagram for the new microservices platform',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userId: employees[0].id,
    },
    {
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      userId: employees[1].id,
    },
    {
      title: 'Write unit tests for auth module',
      description: 'Achieve 80% code coverage on the authentication module',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      userId: employees[2].id,
    },
    {
      title: 'Database optimization',
      description: 'Analyze slow queries and add appropriate indexes',
      status: 'DONE',
      priority: 'HIGH',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      userId: employees[0].id,
    },
    {
      title: 'Update API documentation',
      description: 'Ensure all endpoints are documented with request/response examples',
      status: 'IN_PROGRESS',
      priority: 'LOW',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      userId: employees[3].id,
    },
    {
      title: 'Fix login page bug',
      description: 'Users are unable to login on mobile devices due to CORS issue',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      userId: employees[4].id,
    },
    {
      title: 'Implement dark mode',
      description: 'Add dark mode toggle to the dashboard UI',
      status: 'TODO',
      priority: 'LOW',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      userId: employees[1].id,
    },
    {
      title: 'Security audit',
      description: 'Perform a comprehensive security review of the API endpoints',
      status: 'DONE',
      priority: 'HIGH',
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      userId: employees[2].id,
    },
    {
      title: 'Onboarding flow redesign',
      description: 'Redesign the user onboarding experience to improve conversion rates',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      userId: employees[3].id,
    },
    {
      title: 'Performance profiling',
      description: 'Profile the application under load and identify bottlenecks',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      userId: employees[4].id,
    },
  ];

  const tasks = await Promise.all(
    taskData.map((t) => prisma.task.create({ data: t }))
  );
  console.log(`✅ Created 10 sample Tasks`);

  // Create sample audit logs for context
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        taskId: tasks[0].id,
        action: 'CREATED',
        changes: JSON.stringify({ title: tasks[0].title, status: 'TODO' }),
      },
      {
        userId: manager1.id,
        taskId: tasks[1].id,
        action: 'UPDATED',
        changes: JSON.stringify({ before: { status: 'TODO' }, after: { status: 'IN_PROGRESS' } }),
      },
      {
        userId: admin.id,
        taskId: tasks[3].id,
        action: 'UPDATED',
        changes: JSON.stringify({ before: { status: 'IN_PROGRESS' }, after: { status: 'DONE' } }),
      },
    ],
  });
  console.log(`✅ Created sample AuditLogs`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('  ADMIN:    admin@taskflow.com     / Admin@1234');
  console.log('  MANAGER1: manager1@taskflow.com  / Manager@1234');
  console.log('  MANAGER2: manager2@taskflow.com  / Manager@5678');
  console.log('  EMPLOYEE: employee1@taskflow.com / Emp@1111');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
