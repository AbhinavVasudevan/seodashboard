import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'writer@seodashboard.com'
  const password = 'writer123'
  const name = 'Writer User'

  // Check if writer already exists
  const existing = await prisma.user.findUnique({
    where: { email }
  })

  if (existing) {
    console.log('✅ Writer user already exists!')
    console.log(`Email: ${email}`)
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Create writer user
  const writer = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: 'WRITER',
      isActive: true,
    }
  })

  console.log('✅ Writer user created successfully!')
  console.log(`Email: ${writer.email}`)
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
