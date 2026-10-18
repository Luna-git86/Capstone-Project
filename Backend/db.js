// Backend/db.js
const { PrismaClient } = require('@prisma/client');

// Mencegah pembuatan multiple instance Prisma saat development
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

module.exports = prisma;