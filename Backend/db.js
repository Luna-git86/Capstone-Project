// database connection
const { PrismaClient } = require("@prisma/client");
// Initialize Prisma Client
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

module.exports = prisma;
