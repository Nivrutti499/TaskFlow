require('dotenv').config();
const app = require('../src/app');

const PORT = process.env.PORT || 3000;

// Only start the HTTP server when running locally (not as Vercel serverless)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║          TaskFlow API Server Started          ║
╠═══════════════════════════════════════════════╣
║  Environment : ${(process.env.NODE_ENV || 'development').padEnd(29)}║
║  Port        : ${String(PORT).padEnd(29)}║
║  Health      : http://localhost:${PORT}/health         ║
║  API Docs    : http://localhost:${PORT}/api/docs       ║
╚═══════════════════════════════════════════════╝
    `);
  });
}

// Export for Vercel serverless
module.exports = app;
