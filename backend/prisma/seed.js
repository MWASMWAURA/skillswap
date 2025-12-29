const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Create skill categories first
  const programmingCategory = await prisma.skillCategory.create({
    data: {
      name: 'Programming',
      description: 'Software development and programming skills'
    }
  });

  const artCategory = await prisma.skillCategory.create({
    data: {
      name: 'Art',
      description: 'Creative and artistic skills'
    }
  });

  const culinaryCategory = await prisma.skillCategory.create({
    data: {
      name: 'Culinary',
      description: 'Cooking and food preparation skills'
    }
  });

  // Create sample users
  const user1 = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: '$2a$10$hashedpassword', // Use bcrypt hash
      location: 'New York',
      interests: '["JavaScript", "Photography"]',
      skills: {
        create: [
          { 
            title: 'JavaScript', 
            description: 'Web development', 
            categoryId: programmingCategory.id, 
            mode: 'Online', 
            duration: 60,
            requirements: '[]',
            tags: '[]'
          },
          { 
            title: 'Photography', 
            description: 'Digital photography', 
            categoryId: artCategory.id, 
            mode: 'In-person', 
            duration: 90,
            requirements: '[]',
            tags: '[]'
          }
        ]
      }
    }
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: '$2a$10$hashedpassword',
      location: 'San Francisco',
      interests: '["Python", "Cooking"]',
      skills: {
        create: [
          { 
            title: 'Python', 
            description: 'Data science', 
            categoryId: programmingCategory.id, 
            mode: 'Online', 
            duration: 45,
            requirements: '[]',
            tags: '[]'
          },
          { 
            title: 'Cooking', 
            description: 'Italian cuisine', 
            categoryId: culinaryCategory.id, 
            mode: 'In-person', 
            duration: 120,
            requirements: '[]',
            tags: '[]'
          }
        ]
      }
    }
  });

  // Create a sample exchange
  const exchange = await prisma.exchange.create({
    data: {
      skillId: 1, // Alice's JavaScript skill
      requesterId: user2.id, // Bob requesting
      providerId: user1.id, // Alice providing
      status: 'Active',
      messages: {
        create: [
          { senderId: user2.id, message: 'Hi, interested in your JavaScript skill!' },
          { senderId: user1.id, message: 'Sure, lets exchange!' }
        ]
      }
    }
  });

  console.log('Seed data created');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });