import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check current admin user
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@seodashboard.com' }
  })

  console.log('Current admin status:', admin)

  if (admin && !admin.isActive) {
    // Activate the admin user
    const updated = await prisma.user.update({
      where: { email: 'admin@seodashboard.com' },
      data: { isActive: true }
    })
    console.log('✅ Admin user activated:', updated)
  } else if (admin) {
    console.log('✅ Admin is already active')
  } else {
    console.log('❌ Admin user not found')
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
