const prisma = require('./db');

async function main() {
  const tickets = await prisma.ticket.findMany({
    select: {
      id: true,
      judul: true,
      status: true,
      deadline: true,
      pelaksanaId: true,
    },
    orderBy: { id: 'desc' },
    take: 10,
  });

  console.table(
    tickets.map((ticket) => ({
      ...ticket,
      deadline: ticket.deadline
        ? ticket.deadline.toISOString()
        : null,
    }))
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });