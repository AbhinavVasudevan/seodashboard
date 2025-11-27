import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a default user
  const user = await prisma.user.upsert({
    where: { id: 'user-1' },
    update: {},
    create: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Default User',
    },
  })

  console.log('Created user:', user)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
