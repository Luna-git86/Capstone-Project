
const prisma = require('./db');
const bcrypt = require('bcrypt');

async function createAdmin() {
  try {
    const nama = 'Administrator';
    const noHp = '082260737808';
    const password = '123';

    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await prisma.user.findUnique({
      where: { noHp },
    });

    if (existingUser) {
      console.log('Nomor HP sudah terdaftar.');
      console.log('Nama:', existingUser.nama);
      console.log('Role:', existingUser.role);
      return;
    }

    const admin = await prisma.user.create({
      data: {
        nama,
        noHp,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('Akun ADMIN berhasil dibuat!');
    console.log('Nama:', admin.nama);
    console.log('No HP:', admin.noHp);
    console.log('Role:', admin.role);
  } catch (error) {
    console.error('Gagal membuat akun ADMIN:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
