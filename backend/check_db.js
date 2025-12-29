const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    
    console.log(`Found ${users.length} users in database:`);
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}, Created: ${user.createdAt}`);
    });
    
    // Check if any admin users exist
    const adminUsers = users.filter(u => u.role === 'admin');
    console.log(`\nAdmin users found: ${adminUsers.length}`);
    if (adminUsers.length > 0) {
      adminUsers.forEach(admin => {
        console.log(`Admin: ${admin.name} (${admin.email})`);
      });
    } else {
      console.log('No admin users found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();