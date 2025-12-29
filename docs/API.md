# SkillSwap API Documentation

## Base URL
- Development: `http://localhost:5000/api`
- Production: `https://api.skillswap.com/api`

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /auth/login
Authenticate a user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Skills

### GET /skills
Get list of skills with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| category | string | Filter by category |
| search | string | Search in title/description |
| level | string | Filter by level (Beginner/Intermediate/Advanced) |

**Response (200):**
```json
{
  "skills": [
    {
      "id": "skill_123",
      "title": "JavaScript Programming",
      "description": "Learn modern JavaScript",
      "category": "Technology",
      "level": "Intermediate",
      "user": {
        "id": "user_456",
        "name": "Jane Smith"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "hasMore": true
}
```

### GET /skills/:id
Get skill details.

**Response (200):**
```json
{
  "id": "skill_123",
  "title": "JavaScript Programming",
  "description": "Learn modern JavaScript from basics to advanced concepts",
  "category": "Technology",
  "level": "Intermediate",
  "requirements": "Basic computer knowledge",
  "duration": "4 weeks",
  "user": {
    "id": "user_456",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "bio": "Senior developer with 10 years experience"
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### POST /skills
Create a new skill. **Requires authentication.**

**Request Body:**
```json
{
  "title": "Python Programming",
  "description": "Learn Python from scratch",
  "category": "Technology",
  "level": "Beginner",
  "requirements": "No prior experience needed",
  "duration": "6 weeks"
}
```

**Response (201):**
```json
{
  "id": "skill_789",
  "title": "Python Programming",
  "description": "Learn Python from scratch",
  "category": "Technology",
  "level": "Beginner",
  "userId": "user_123",
  "createdAt": "2024-01-20T14:00:00Z"
}
```

### PUT /skills/:id
Update a skill. **Requires authentication. Owner only.**

### DELETE /skills/:id
Delete a skill. **Requires authentication. Owner only.**

---

## Exchanges

### GET /exchanges
Get user's exchanges. **Requires authentication.**

**Response (200):**
```json
[
  {
    "id": "exchange_123",
    "status": "active",
    "skill": {
      "id": "skill_456",
      "title": "JavaScript Programming"
    },
    "learner": {
      "id": "user_789",
      "name": "John Doe"
    },
    "teacher": {
      "id": "user_456",
      "name": "Jane Smith"
    },
    "createdAt": "2024-01-18T09:00:00Z"
  }
]
```

### POST /exchanges
Create an exchange request. **Requires authentication.**

**Request Body:**
```json
{
  "skillId": "skill_456",
  "teacherId": "user_456",
  "message": "I would love to learn this skill!"
}
```

### POST /exchanges/:id/accept
Accept an exchange request. **Requires authentication. Teacher only.**

### POST /exchanges/:id/reject
Reject an exchange request. **Requires authentication. Teacher only.**

### POST /exchanges/:id/complete
Mark exchange as complete. **Requires authentication.**

---

## Messages

### GET /messages/conversations
Get user's conversations. **Requires authentication.**

### GET /messages/:exchangeId
Get messages for an exchange. **Requires authentication.**

**Response (200):**
```json
[
  {
    "id": "msg_123",
    "content": "Hello! Ready to start learning?",
    "senderId": "user_456",
    "createdAt": "2024-01-18T10:00:00Z"
  }
]
```

### POST /messages/:exchangeId
Send a message. **Requires authentication.**

**Request Body:**
```json
{
  "content": "Yes, I'm excited to begin!"
}
```

---

## Search

### GET /search
Search skills and users.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query (required) |
| type | string | Filter by type (skills/users) |
| limit | number | Max results (default: 20) |

**Response (200):**
```json
{
  "results": [
    {
      "type": "skill",
      "id": "skill_123",
      "title": "JavaScript Programming",
      "category": "Technology",
      "score": 0.95
    }
  ],
  "total": 15
}
```

---

## Users

### GET /users/profile
Get current user's profile. **Requires authentication.**

### PUT /users/profile
Update current user's profile. **Requires authentication.**

**Request Body:**
```json
{
  "name": "John Doe",
  "bio": "Passionate learner",
  "skills": ["JavaScript", "Python"]
}
```

### POST /users/avatar
Upload profile avatar. **Requires authentication.**

**Request:** multipart/form-data with `avatar` file field.

---

## Notifications

### GET /notifications
Get user's notifications. **Requires authentication.**

### PUT /notifications/:id/read
Mark notification as read. **Requires authentication.**

### POST /notifications/push-token
Register push notification token. **Requires authentication.**

**Request Body:**
```json
{
  "token": "ExponentPushToken[xxxxxx]"
}
```

---

## Payments

### POST /payments/create-intent
Create a payment intent. **Requires authentication.**

**Request Body:**
```json
{
  "amount": 50.00,
  "currency": "usd"
}
```

**Response (200):**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### GET /payments/history
Get payment history. **Requires authentication.**

---

## WebSocket Events

Connect to WebSocket at `ws://localhost:5000` with auth token.

### Events

**join_exchange** - Join an exchange room
```json
{ "exchangeId": "exchange_123" }
```

**new_message** - Receive new message
```json
{
  "id": "msg_456",
  "content": "Hello!",
  "senderId": "user_789",
  "createdAt": "2024-01-18T10:00:00Z"
}
```

**join_call** - Join video call room
```json
{ "exchangeId": "exchange_123" }
```

**call_offer** / **call_answer** / **ice_candidate** - WebRTC signaling

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705580400
```
