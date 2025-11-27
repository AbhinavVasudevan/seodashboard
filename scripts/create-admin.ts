import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@seodashboard.com'
  const password = 'admin123'
  const name = 'Admin User'

  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email }
  })

  if (existing) {
    console.log('✅ Admin user already exists!')
    console.log(`Email: ${email}`)
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    }
  })

  console.log('✅ Admin user created successfully!')
  console.log(`Email: ${admin.email}`)
  console.log(`Password: ${password}`)
  console.log(`\n⚠️  Please change the password after first login!`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
