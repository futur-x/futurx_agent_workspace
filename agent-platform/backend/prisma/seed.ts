import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create default admin user from environment variables
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  const adminUser = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      password: hashedPassword,
      role: 'admin',
      isActive: true
    }
  })

  console.log('Created admin user:', adminUser)

  // Create a sample normal user
  const userPassword = await bcrypt.hash('user123', 10)

  const normalUser = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      password: userPassword,
      role: 'user',
      isActive: true
    }
  })

  console.log('Created test user:', normalUser)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })