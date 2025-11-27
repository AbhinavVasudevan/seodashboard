import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.TEST_EMAIL || 'admin@seodashboard.com'
  const testPassword = process.env.TEST_PASSWORD

  if (!testPassword) {
    console.error('❌ Please set TEST_PASSWORD environment variable')
    console.error('   Example: TEST_PASSWORD=yourpassword npx ts-node scripts/test-password.ts')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    console.log(`❌ User not found: ${email}`)
    return
  }

  console.log('User found:')
  console.log('- Email:', user.email)
  console.log('- Role:', user.role)

  // Test the password
  const isValid = await bcrypt.compare(testPassword, user.password)
  console.log(`\nPassword test: ${isValid ? '✅ VALID' : '❌ INVALID'}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
