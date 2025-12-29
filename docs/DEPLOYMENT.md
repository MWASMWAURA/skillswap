# SkillSwap Deployment Guide

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (or use Docker)
- Redis (optional, for caching)
- Domain name with SSL certificate

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/skillswap.git
cd skillswap
```

### 2. Environment Variables

Create `.env` files for each environment:

**Backend (.env)**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/skillswap

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=production

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=SkillSwap <noreply@skillswap.com>

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# File Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=skillswap-uploads
AWS_REGION=us-east-1
```

**Frontend (.env.production)**
```env
NEXT_PUBLIC_API_URL=https://api.skillswap.com
NEXT_PUBLIC_WS_URL=wss://api.skillswap.com
NEXT_PUBLIC_STRIPE_KEY=pk_live_xxx
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale backend=3
```

### Option 2: Manual Deployment

#### Backend
```bash
cd backend
npm ci --production
npx prisma migrate deploy
npm start
```

#### Frontend
```bash
cd frontend
npm ci
npm run build
npm start
```

### Option 3: Cloud Platforms

#### AWS (ECS/Fargate)
1. Push Docker images to ECR
2. Create ECS cluster and task definitions
3. Configure Application Load Balancer
4. Set up RDS for PostgreSQL
5. Configure ElastiCache for Redis

#### Vercel (Frontend)
```bash
cd frontend
vercel --prod
```

#### Railway/Render (Backend)
Connect GitHub repository and configure environment variables.

## Database Setup

### Initial Migration
```bash
cd backend
npx prisma migrate deploy
```

### Seed Data (Optional)
```bash
npx prisma db seed
```

### Backup Strategy
```bash
# Daily backup script
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20240115.sql
```

## SSL/TLS Configuration

### Using Let's Encrypt with Nginx
```nginx
server {
    listen 80;
    server_name skillswap.com api.skillswap.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name skillswap.com;

    ssl_certificate /etc/letsencrypt/live/skillswap.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/skillswap.com/privkey.pem;

    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name api.skillswap.com;

    ssl_certificate /etc/letsencrypt/live/skillswap.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/skillswap.com/privkey.pem;

    location / {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring & Logging

### Health Checks
- Backend: `GET /health`
- Frontend: `GET /api/health`

### Logging
Configure centralized logging with:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- CloudWatch Logs (AWS)
- Datadog

### Metrics
- Prometheus + Grafana
- New Relic
- Datadog APM

## Scaling Considerations

### Horizontal Scaling
- Use load balancer for multiple backend instances
- Ensure session storage is external (Redis)
- Use CDN for static assets

### Database Scaling
- Read replicas for read-heavy workloads
- Connection pooling with PgBouncer
- Consider sharding for large datasets

### Caching Strategy
- Redis for session and API caching
- CDN for static assets
- Browser caching headers

## Security Checklist

- [ ] All secrets in environment variables
- [ ] HTTPS enabled everywhere
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS protection headers
- [ ] CSRF tokens for forms
- [ ] Input validation on all endpoints
- [ ] Regular dependency updates
- [ ] Security headers (Helmet.js)

## Rollback Procedure

1. Identify the issue
2. Switch to previous Docker image tag
3. Rollback database if needed:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```
4. Verify system health
5. Investigate root cause

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Check DATABASE_URL format
- Verify network connectivity
- Check PostgreSQL logs

**WebSocket Not Connecting**
- Verify proxy configuration
- Check CORS settings
- Ensure proper upgrade headers

**Slow Performance**
- Check database query performance
- Verify Redis connection
- Review application logs

## Support

For deployment issues, contact:
- Email: devops@skillswap.com
- Slack: #skillswap-ops
