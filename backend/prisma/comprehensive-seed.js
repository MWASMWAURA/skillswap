const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Sample data
const skillCategories = [
  'Technology',
  'Creative Arts',
  'Languages',
  'Business & Finance',
  'Health & Fitness',
  'Cooking & Food',
  'Music',
  'Sports & Recreation',
  'Academic',
  'Life Skills'
];

const skillTemplates = {
  Technology: [
    { title: 'JavaScript Programming', description: 'Learn modern JavaScript including ES6+, async/await, and popular frameworks', mode: 'online', duration: 60 },
    { title: 'React Development', description: 'Build dynamic user interfaces with React.js', mode: 'online', duration: 90 },
    { title: 'Python for Beginners', description: 'Start your programming journey with Python', mode: 'online', duration: 60 },
    { title: 'Web Design Fundamentals', description: 'Learn HTML, CSS, and responsive design principles', mode: 'online', duration: 45 },
    { title: 'Data Analysis with Excel', description: 'Master Excel for data analysis and visualization', mode: 'online', duration: 60 }
  ],
  'Creative Arts': [
    { title: 'Digital Painting', description: 'Learn digital art techniques using popular software', mode: 'online', duration: 90 },
    { title: 'Photography Basics', description: 'Master composition, lighting, and camera settings', mode: 'in-person', duration: 120 },
    { title: 'Graphic Design', description: 'Create stunning designs with professional software', mode: 'online', duration: 75 },
    { title: 'Creative Writing', description: 'Develop your storytelling and creative writing skills', mode: 'online', duration: 60 },
    { title: 'Video Editing', description: 'Learn to edit professional-quality videos', mode: 'online', duration: 90 }
  ],
  Languages: [
    { title: 'Spanish Conversation', description: 'Improve your Spanish speaking and listening skills', mode: 'online', duration: 60 },
    { title: 'French Basics', description: 'Learn fundamental French language skills', mode: 'online', duration: 60 },
    { title: 'English Grammar', description: 'Perfect your English grammar and writing', mode: 'online', duration: 45 },
    { title: 'Sign Language', description: 'Learn basic American Sign Language', mode: 'in-person', duration: 90 },
    { title: 'Mandarin Chinese', description: 'Introduction to Mandarin Chinese language', mode: 'online', duration: 60 }
  ],
  'Business & Finance': [
    { title: 'Personal Finance Management', description: 'Learn budgeting, investing, and financial planning', mode: 'online', duration: 60 },
    { title: 'Public Speaking', description: 'Develop confident presentation and speaking skills', mode: 'online', duration: 75 },
    { title: 'Entrepreneurship Basics', description: 'Learn how to start and run your own business', mode: 'online', duration: 90 },
    { title: 'Leadership Skills', description: 'Develop effective leadership and management abilities', mode: 'online', duration: 60 },
    { title: 'Marketing Fundamentals', description: 'Understand core marketing principles and strategies', mode: 'online', duration: 60 }
  ],
  'Health & Fitness': [
    { title: 'Yoga & Meditation', description: 'Learn yoga poses, breathing techniques, and meditation', mode: 'in-person', duration: 60 },
    { title: 'Home Workout Routines', description: 'Create effective workout routines for home fitness', mode: 'online', duration: 45 },
    { title: 'Nutrition Planning', description: 'Learn about balanced nutrition and meal planning', mode: 'online', duration: 60 },
    { title: 'Stress Management', description: 'Develop techniques for managing stress and anxiety', mode: 'online', duration: 45 },
    { title: 'First Aid Basics', description: 'Essential first aid skills for emergency situations', mode: 'in-person', duration: 90 }
  ],
  'Cooking & Food': [
    { title: 'Italian Cooking', description: 'Learn to make authentic Italian dishes', mode: 'in-person', duration: 120 },
    { title: 'Baking Basics', description: 'Master the fundamentals of baking', mode: 'online', duration: 90 },
    { title: 'Vegetarian Cooking', description: 'Create delicious vegetarian and vegan meals', mode: 'online', duration: 60 },
    { title: 'Wine Tasting', description: 'Learn about different wines and tasting techniques', mode: 'in-person', duration: 90 },
    { title: 'Fermentation & Pickling', description: 'Traditional food preservation techniques', mode: 'in-person', duration: 75 }
  ],
  Music: [
    { title: 'Guitar for Beginners', description: 'Learn basic guitar chords and songs', mode: 'online', duration: 60 },
    { title: 'Piano Basics', description: 'Start your piano journey with fundamental techniques', mode: 'online', duration: 45 },
    { title: 'Music Theory', description: 'Understand scales, chords, and musical structure', mode: 'online', duration: 60 },
    { title: 'Voice Training', description: 'Improve singing technique and vocal health', mode: 'online', duration: 45 },
    { title: 'DJ Skills', description: 'Learn mixing techniques and DJ equipment', mode: 'in-person', duration: 90 }
  ],
  'Sports & Recreation': [
    { title: 'Swimming Techniques', description: 'Learn proper swimming strokes and techniques', mode: 'in-person', duration: 60 },
    { title: 'Tennis Basics', description: 'Master tennis fundamentals and court strategy', mode: 'in-person', duration: 90 },
    { title: 'Rock Climbing', description: 'Introduction to indoor and outdoor rock climbing', mode: 'in-person', duration: 120 },
    { title: 'Chess Strategy', description: 'Learn chess openings, tactics, and strategy', mode: 'online', duration: 60 },
    { title: 'Martial Arts Basics', description: 'Introduction to basic martial arts techniques', mode: 'in-person', duration: 60 }
  ],
  Academic: [
    { title: 'Mathematics Tutoring', description: 'Help with algebra, calculus, and advanced math', mode: 'online', duration: 60 },
    { title: 'Science Projects', description: 'Science fair project guidance and methodology', mode: 'online', duration: 90 },
    { title: 'Study Techniques', description: 'Effective study methods and time management', mode: 'online', duration: 45 },
    { title: 'Academic Writing', description: 'Improve essay writing and research skills', mode: 'online', duration: 60 },
    { title: 'Test Preparation', description: 'SAT, ACT, and standardized test prep strategies', mode: 'online', duration: 75 }
  ],
  'Life Skills': [
    { title: 'Time Management', description: 'Learn to manage your time effectively', mode: 'online', duration: 45 },
    { title: 'Carpentry Basics', description: 'Basic woodworking and home repair skills', mode: 'in-person', duration: 120 },
    { title: 'Gardening', description: 'Learn vegetable gardening and plant care', mode: 'in-person', duration: 90 },
    { title: 'Sewing & Textiles', description: 'Basic sewing and clothing alteration skills', mode: 'in-person', duration: 60 },
    { title: 'Personal Organization', description: 'Organize your home and digital life', mode: 'online', duration: 45 }
  ]
};

const badgeTemplates = [
  { badgeName: 'First Exchange', description: 'Completed your first skill exchange' },
  { badgeName: 'Rising Star', description: 'Achieved level 5 or higher' },
  { badgeName: 'Helper', description: 'Completed 5 skill exchanges as a teacher' },
  { badgeName: 'Learner', description: 'Completed 5 skill exchanges as a student' },
  { badgeName: 'Popular Teacher', description: 'Has 10+ active skill listings' },
  { badgeName: 'Community Favorite', description: 'Earned 100+ reputation points' },
  { badgeName: 'Streak Master', description: 'Maintained a 7-day activity streak' },
  { badgeName: 'Quick Learner', description: 'Completed 3 exchanges in one week' },
  { badgeName: 'Mentor', description: 'Taught someone for 10+ hours' },
  { badgeName: 'Student', description: 'Learned from someone for 10+ hours' }
];

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  // Clean existing data
  await prisma.message.deleteMany();
  await prisma.exchange.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.skillCategory.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleared existing data');

  // Create skill categories first
  const categories = [];
  for (const categoryName of skillCategories) {
    const category = await prisma.skillCategory.create({
      data: {
        name: categoryName,
        description: `Learn ${categoryName.toLowerCase()} skills from the community`
      }
    });
    categories.push(category);
  }
  console.log(`📂 Created ${categories.length} skill categories`);

  // Create users
  const users = [];
  const userData = [
    { name: 'Alex Johnson', email: 'alex@example.com', location: 'New York, NY' },
    { name: 'Maria Garcia', email: 'maria@example.com', location: 'Los Angeles, CA' },
    { name: 'David Chen', email: 'david@example.com', location: 'San Francisco, CA' },
    { name: 'Sarah Williams', email: 'sarah@example.com', location: 'Chicago, IL' },
    { name: 'Michael Brown', email: 'michael@example.com', location: 'Austin, TX' },
    { name: 'Emma Davis', email: 'emma@example.com', location: 'Seattle, WA' },
    { name: 'James Wilson', email: 'james@example.com', location: 'Miami, FL' },
    { name: 'Lisa Anderson', email: 'lisa@example.com', location: 'Denver, CO' },
    { name: 'Robert Taylor', email: 'robert@example.com', location: 'Portland, OR' },
    { name: 'Jennifer Martinez', email: 'jennifer@example.com', location: 'Boston, MA' },
    { name: 'Christopher Lee', email: 'christopher@example.com', location: 'Phoenix, AZ' },
    { name: 'Amanda Thompson', email: 'amanda@example.com', location: 'Nashville, TN' },
    { name: 'Daniel White', email: 'daniel@example.com', location: 'Atlanta, GA' },
    { name: 'Rachel Green', email: 'rachel@example.com', location: 'San Diego, CA' },
    { name: 'Kevin Harris', email: 'kevin@example.com', location: 'Dallas, TX' },
    { name: 'Nicole Lewis', email: 'nicole@example.com', location: 'Minneapolis, MN' },
    { name: 'Brian Clark', email: 'brian@example.com', location: 'Tampa, FL' },
    { name: 'Stephanie Young', email: 'stephanie@example.com', location: 'Salt Lake City, UT' },
    { name: 'Mark Rodriguez', email: 'mark@example.com', location: 'Las Vegas, NV' },
    { name: 'Laura Hall', email: 'laura@example.com', location: 'Raleigh, NC' }
  ];

  for (const data of userData) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        reputation: Math.floor(Math.random() * 200) + 10,
        xp: Math.floor(Math.random() * 1000) + 100,
        level: Math.floor(Math.random() * 10) + 1,
        streak: Math.floor(Math.random() * 30) + 1
      }
    });
    users.push(user);
  }

  console.log('👥 Created 20 users');

  // Create skills
  const skills = [];
  for (const user of users) {
    // Each user gets 2-5 skills
    const numSkills = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < numSkills; i++) {
      const categoryName = skillCategories[Math.floor(Math.random() * skillCategories.length)];
      const category = categories.find(c => c.name === categoryName);
      const skillTemplatesForCategory = skillTemplates[categoryName];
      const skillTemplate = skillTemplatesForCategory[Math.floor(Math.random() * skillTemplatesForCategory.length)];
      
      const skill = await prisma.skill.create({
        data: {
          ...skillTemplate,
          categoryId: category.id,
          userId: user.id
        }
      });
      skills.push(skill);
    }
  }

  console.log('🎯 Created skills for all users');

  // Create exchanges
  const exchanges = [];
  for (let i = 0; i < 50; i++) {
    const skill = skills[Math.floor(Math.random() * skills.length)];
    const requester = users[Math.floor(Math.random() * users.length)];
    
    // Ensure requester is different from skill owner
    let provider = users[Math.floor(Math.random() * users.length)];
    while (provider.id === skill.userId || provider.id === requester.id) {
      provider = users[Math.floor(Math.random() * users.length)];
    }
    
    const statuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const exchange = await prisma.exchange.create({
      data: {
        skillId: skill.id,
        requesterId: requester.id,
        providerId: provider.id,
        status,
        timeCredits: Math.floor(Math.random() * 10) + 1,
        payment: status === 'completed' ? Math.random() * 50 : 0,
        completedAt: status === 'completed' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null
      }
    });
    exchanges.push(exchange);
  }

  console.log('🔄 Created 50 exchanges');

  // Create messages
  const messages = [];
  for (const exchange of exchanges.slice(0, 30)) {
    // Create 1-5 messages per exchange
    const numMessages = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < numMessages; i++) {
      const sender = Math.random() > 0.5 ? 
        users.find(u => u.id === exchange.requesterId) : 
        users.find(u => u.id === exchange.providerId);
      
      const messageContent = [
        'Hi! I saw your skill listing and I\'m interested in learning.',
        'That sounds great! When would be a good time for you?',
        'I can teach this skill. Would you like to schedule a session?',
        'Thanks for the information. I\'ll let you know!',
        'Looking forward to our exchange session.',
        'Is this skill still available?',
        'I have some questions about the skill requirements.',
        'Perfect! Let\'s set up a time to meet.',
        'This sounds like exactly what I need.',
        'Great, I\'ll send you a calendar invite.'
      ];
      
      const message = await prisma.message.create({
        data: {
          exchangeId: exchange.id,
          senderId: sender.id,
          message: messageContent[Math.floor(Math.random() * messageContent.length)]
        }
      });
      messages.push(message);
    }
  }

  console.log('💬 Created messages for exchanges');

  // Create badges
  const allBadges = [];
  for (const user of users) {
    // Each user gets 1-3 badges
    const numBadges = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numBadges; i++) {
      const badgeTemplate = badgeTemplates[Math.floor(Math.random() * badgeTemplates.length)];
      
      const badge = await prisma.badge.create({
        data: {
          ...badgeTemplate,
          badgeType: 'achievement',
          userId: user.id
        }
      });
      allBadges.push(badge);
    }
  }

  console.log('🏆 Created badges for users');

  console.log('✅ Database seeding completed successfully!');
  console.log(`📊 Statistics:`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Skills: ${skills.length}`);
  console.log(`   - Exchanges: ${exchanges.length}`);
  console.log(`   - Messages: ${messages.length}`);
  console.log(`   - Badges: ${allBadges.length}`);
  
  console.log('\n🔑 Test Accounts:');
  console.log('   Email: alex@example.com | Password: password123');
  console.log('   Email: maria@example.com | Password: password123');
  console.log('   Email: david@example.com | Password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });