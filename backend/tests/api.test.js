const request = require('supertest');
const app = require('../src/app');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Skills API', () => {
  let authToken;
  let testUser;
  let testSkill;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'skilltest@example.com',
        password: '$2b$10$test.hash.password',
        name: 'Skill Test User',
      },
    });

    // Get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'skilltest@example.com', password: 'password123' });
    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.skill.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('POST /api/skills', () => {
    it('should create a new skill', async () => {
      const res = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'JavaScript Programming',
          description: 'Learn modern JavaScript',
          category: 'Technology',
          level: 'Intermediate',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('JavaScript Programming');
      testSkill = res.body;
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .post('/api/skills')
        .send({
          title: 'Test Skill',
          description: 'Test description',
          category: 'Technology',
        });

      expect(res.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          description: '',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/skills', () => {
    it('should return list of skills', async () => {
      const res = await request(app).get('/api/skills');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.skills)).toBe(true);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/skills')
        .query({ category: 'Technology' });

      expect(res.status).toBe(200);
      res.body.skills.forEach(skill => {
        expect(skill.category).toBe('Technology');
      });
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/skills')
        .query({ page: 1, limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.skills.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/skills/:id', () => {
    it('should return skill details', async () => {
      const res = await request(app).get(`/api/skills/${testSkill.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testSkill.id);
      expect(res.body.title).toBe(testSkill.title);
    });

    it('should return 404 for non-existent skill', async () => {
      const res = await request(app).get('/api/skills/non-existent-id');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/skills/:id', () => {
    it('should update skill', async () => {
      const res = await request(app)
        .put(`/api/skills/${testSkill.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated JavaScript Programming',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated JavaScript Programming');
    });

    it('should not allow updating others skills', async () => {
      // Create another user's skill
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'hash',
          name: 'Other User',
        },
      });
      const otherSkill = await prisma.skill.create({
        data: {
          title: 'Other Skill',
          description: 'Other description',
          category: 'Other',
          userId: otherUser.id,
        },
      });

      const res = await request(app)
        .put(`/api/skills/${otherSkill.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Hacked' });

      expect(res.status).toBe(403);

      // Cleanup
      await prisma.skill.delete({ where: { id: otherSkill.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('DELETE /api/skills/:id', () => {
    it('should delete skill', async () => {
      const res = await request(app)
        .delete(`/api/skills/${testSkill.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      // Verify deletion
      const checkRes = await request(app).get(`/api/skills/${testSkill.id}`);
      expect(checkRes.status).toBe(404);
    });
  });
});

describe('Exchanges API', () => {
  let authToken;
  let testUser;
  let teacherUser;
  let testSkill;
  let testExchange;

  beforeAll(async () => {
    // Create users
    testUser = await prisma.user.create({
      data: {
        email: 'exchangetest@example.com',
        password: '$2b$10$test.hash',
        name: 'Exchange Test User',
      },
    });

    teacherUser = await prisma.user.create({
      data: {
        email: 'teacher@example.com',
        password: '$2b$10$test.hash',
        name: 'Teacher User',
      },
    });

    // Create skill
    testSkill = await prisma.skill.create({
      data: {
        title: 'Test Skill',
        description: 'Test description',
        category: 'Technology',
        userId: teacherUser.id,
      },
    });

    // Get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'exchangetest@example.com', password: 'password123' });
    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    await prisma.exchange.deleteMany({});
    await prisma.skill.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: { in: ['exchangetest@example.com', 'teacher@example.com'] },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/exchanges', () => {
    it('should create exchange request', async () => {
      const res = await request(app)
        .post('/api/exchanges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          skillId: testSkill.id,
          teacherId: teacherUser.id,
          message: 'I want to learn this skill',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('pending');
      testExchange = res.body;
    });

    it('should not allow duplicate requests', async () => {
      const res = await request(app)
        .post('/api/exchanges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          skillId: testSkill.id,
          teacherId: teacherUser.id,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/exchanges', () => {
    it('should return user exchanges', async () => {
      const res = await request(app)
        .get('/api/exchanges')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/exchanges/:id/accept', () => {
    it('should accept exchange request', async () => {
      // Login as teacher
      const teacherLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'teacher@example.com', password: 'password123' });

      const res = await request(app)
        .post(`/api/exchanges/${testExchange.id}/accept`)
        .set('Authorization', `Bearer ${teacherLogin.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
    });
  });
});

describe('Messages API', () => {
  let authToken;
  let testUser;
  let testExchange;

  beforeAll(async () => {
    // Setup test data
    testUser = await prisma.user.create({
      data: {
        email: 'messagetest@example.com',
        password: '$2b$10$test.hash',
        name: 'Message Test User',
      },
    });

    const otherUser = await prisma.user.create({
      data: {
        email: 'other2@example.com',
        password: '$2b$10$test.hash',
        name: 'Other User',
      },
    });

    const skill = await prisma.skill.create({
      data: {
        title: 'Message Test Skill',
        description: 'Test',
        category: 'Test',
        userId: otherUser.id,
      },
    });

    testExchange = await prisma.exchange.create({
      data: {
        skillId: skill.id,
        learnerId: testUser.id,
        teacherId: otherUser.id,
        status: 'active',
      },
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'messagetest@example.com', password: 'password123' });
    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    await prisma.message.deleteMany({});
    await prisma.exchange.deleteMany({});
    await prisma.skill.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: { in: ['messagetest@example.com', 'other2@example.com'] },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/messages/:exchangeId', () => {
    it('should send a message', async () => {
      const res = await request(app)
        .post(`/api/messages/${testExchange.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Hello, this is a test message' });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('Hello, this is a test message');
    });
  });

  describe('GET /api/messages/:exchangeId', () => {
    it('should get messages for exchange', async () => {
      const res = await request(app)
        .get(`/api/messages/${testExchange.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

describe('Search API', () => {
  beforeAll(async () => {
    // Create test skills for search
    const user = await prisma.user.create({
      data: {
        email: 'searchtest@example.com',
        password: 'hash',
        name: 'Search Test',
      },
    });

    await prisma.skill.createMany({
      data: [
        { title: 'Python Programming', description: 'Learn Python', category: 'Technology', userId: user.id },
        { title: 'Spanish Language', description: 'Learn Spanish', category: 'Languages', userId: user.id },
        { title: 'Guitar Lessons', description: 'Learn Guitar', category: 'Music', userId: user.id },
      ],
    });
  });

  afterAll(async () => {
    await prisma.skill.deleteMany({});
    await prisma.user.deleteMany({ where: { email: 'searchtest@example.com' } });
    await prisma.$disconnect();
  });

  describe('GET /api/search', () => {
    it('should search skills by query', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ q: 'Python' });

      expect(res.status).toBe(200);
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(res.body.results[0].title).toContain('Python');
    });

    it('should return empty for no matches', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ q: 'nonexistentskill12345' });

      expect(res.status).toBe(200);
      expect(res.body.results.length).toBe(0);
    });
  });
});
