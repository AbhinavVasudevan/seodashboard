import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@seodashboard.com' }
  })

  if (!admin) {
    console.log('❌ Admin user not found')
    return
  }

  console.log('Admin user found:')
  console.log('- Email:', admin.email)
  console.log('- Name:', admin.name)
  console.log('- Role:', admin.role)
  console.log('- isActive:', admin.isActive)
  console.log('- Password hash:', admin.password)

  // Test the password
  const testPassword = 'admin123'
  const isValid = await bcrypt.compare(testPassword, admin.password)
  console.log(`\nPassword test for '${testPassword}': ${isValid ? '✅ VALID' : '❌ INVALID'}`)

  // If password is invalid, reset it
  if (!isValid) {
    console.log('\n⚠️  Password hash is invalid! Resetting password...')
    const newHash = await bcrypt.hash(testPassword, 10)
    await prisma.user.update({
      where: { email: 'admin@seodashboard.com' },
      data: { password: newHash }
    })
    console.log('✅ Password reset successfully!')
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
