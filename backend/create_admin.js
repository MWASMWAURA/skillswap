const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@skillswap.com',
        password: hashedPassword,
        role: 'admin',
        reputation: 1000,
        xp: 5000,
        level: 10,
        emailVerified: true
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log(`ID: ${adminUser.id}`);
    console.log(`Name: ${adminUser.name}`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
    console.log('\nLogin credentials:');
    console.log('Email: admin@skillswap.com');
    console.log('Password: admin123');
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('Admin user already exists!');
    } else {
      console.error('Error creating admin user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();