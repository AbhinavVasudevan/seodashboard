import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@seodashboard.com'
  const password = process.env.ADMIN_PASSWORD
  const name = 'Admin User'

  if (!password) {
    console.error('❌ Please set ADMIN_PASSWORD environment variable')
    console.error('   Example: ADMIN_PASSWORD=yourpassword npx ts-node scripts/create-admin.ts')
    process.exit(1)
  }

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
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
