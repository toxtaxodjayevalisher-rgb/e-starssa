import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding data...')
  
  // O'quvchilarni bazaga qo'shish
  const students = [
    { name: "Aliyev Vali", phone: "+998901112233", dob: "15.03.2005" },
    { name: "Toshmatov Eshmat", phone: "+998902223344", dob: "22.07.2006" },
    { name: "Karimova Nargiza", phone: "+998903334455", dob: "10.01.2005" },
    { name: "Sotvoldiyev Qodir", phone: "+998904445566", dob: "05.11.2006" },
    { name: "Azizova Malika", phone: "+998905556677", dob: "30.08.2005" },
  ];

  for (const s of students) {
    await prisma.student.create({
      data: s
    });
  }

  // Foydalanuvchilarni qo'shish
  const users = [
    { username: 'xumyunmirzo', password: 'thexumo00', role: 'sardor', name: 'Xumoyunmirzo (Asosiy Sardor)' },
    { username: 'Ruxshona', password: 'theruxshona99', role: 'sardor', name: 'Ruxshona (Qizlar Sardori)' },
    { username: 'Shahnozateacher', password: 'Shm0007@', role: 'oqituvchi', name: 'Shahnoza Ustoz' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: u,
    });
  }

  console.log('Seeding tayyor!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
