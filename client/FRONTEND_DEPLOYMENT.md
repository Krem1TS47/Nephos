# Frontend Deployment Guide

This guide covers deploying the Nephos frontend in both development and production environments.

## Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- Backend deployed to AWS (for real data) or running with mock data

Check versions:
```bash
node --version  # Should be v18.x or higher
npm --version   # Should be v9.x or higher
```

---

## Development Deployment (Local)

### Step 1: Install Dependencies

```bash
cd client
npm install
```

### Step 2: Configure Environment

Create `.env.local` file:

```bash
# For development with mock data (default)
echo NEXT_PUBLIC_API_URL=http://localhost:3000/api > .env.local
echo NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001 >> .env.local
```

**For real backend (after deploying to AWS):**

```bash
# Update with your actual API Gateway URLs
echo NEXT_PUBLIC_API_URL=https://YOUR-API-ID.execute-api.us-east-2.amazonaws.com > .env.local
echo NEXT_PUBLIC_WEBSOCKET_URL=wss://YOUR-WS-ID.execute-api.us-east-2.amazonaws.com/production >> .env.local
```

### Step 3: Start Development Server

```bash
npm run dev
```

The app will be available at: `http://localhost:3000`

**What you'll see:**
- **Dashboard**: Summary metrics, charts, recent alerts
- **Instances**: List of all monitored instances (mock or real)
- **Metrics**: Detailed metrics graphs (mock or real)
- **Alerts**: Active and resolved alerts
- **Insights**: AI-generated health summaries

### Step 4: Verify Mock Data is Loading

Open browser dev tools (F12):

1. **Console tab**: Should show no errors
2. **Network tab**: Check these requests succeed:
   - `GET /api/analytics/dashboard` → 200 OK
   - `GET /api/instances` → 200 OK
   - `GET /api/metrics` → 200 OK
   - `GET /api/alerts` → 200 OK
   - `GET /api/insights` → 200 OK

---

## Production Deployment

You have three deployment options:

1. **Vercel** (Recommended - Easiest)
2. **AWS Amplify** (Best AWS integration)
3. **Docker + Any Host** (Most flexible)

---

### Option 1: Deploy to Vercel (Recommended)

Vercel is the creator of Next.js and offers the best performance.

#### 1.1 Install Vercel CLI

```bash
npm install -g vercel
```

#### 1.2 Login to Vercel

```bash
vercel login
```

Choose your preferred login method (GitHub, GitLab, email, etc.).

#### 1.3 Deploy (First Time)

```bash
cd client
vercel
```

Answer the prompts:

```
? Set up and deploy "~/Nephos/client"? Y
? Which scope? [Your account]
? Link to existing project? N
? What's your project's name? nephos-frontend
? In which directory is your code located? ./
? Want to override settings? N
```

This creates a preview deployment.

#### 1.4 Set Environment Variables

```bash
# Add API URL
vercel env add NEXT_PUBLIC_API_URL production
# Paste your API Gateway URL when prompted

# Add WebSocket URL
vercel env add NEXT_PUBLIC_WEBSOCKET_URL production
# Paste your WebSocket URL when prompted
```

#### 1.5 Deploy to Production

```bash
vercel --prod
```

**Your app is now live!** Vercel will give you a URL like:
```
https://nephos-frontend.vercel.app
```

#### 1.6 Custom Domain (Optional)

```bash
vercel domains add yourdomain.com
```

Follow the DNS configuration instructions.

---

### Option 2: Deploy to AWS Amplify

Best option if you want everything in AWS.

#### 2.1 Install Amplify CLI

```bash
npm install -g @aws-amplify/cli
```

#### 2.2 Configure Amplify

```bash
amplify configure
```

This opens AWS Console to create IAM credentials. Follow the prompts.

#### 2.3 Initialize Amplify

```bash
cd client
amplify init
```

Answer prompts:

```
? Enter a name for the project: nephosfrontend
? Enter a name for the environment: prod
? Choose your default editor: Visual Studio Code
? Choose the type of app: javascript
? What framework: react
? Source directory: app
? Distribution directory: .next
? Build command: npm run build
? Start command: npm run start
? Do you want to use an AWS profile? Y
? Select the profile: default
```

#### 2.4 Add Hosting

```bash
amplify add hosting
```

Choose:
```
? Select the plugin module: Hosting with Amplify Console
? Choose a type: Manual deployment
```

#### 2.5 Configure Environment Variables

Edit `amplify/backend/hosting/amplifyhosting/amplifyhosting.json`:

```json
{
  "environmentVariables": {
    "NEXT_PUBLIC_API_URL": "https://YOUR-API-ID.execute-api.us-east-2.amazonaws.com",
    "NEXT_PUBLIC_WEBSOCKET_URL": "wss://YOUR-WS-ID.execute-api.us-east-2.amazonaws.com/production"
  }
}
```

#### 2.6 Deploy

```bash
amplify publish
```

Your app will be deployed to: `https://your-app-id.amplifyapp.com`

#### 2.7 Custom Domain (Optional)

In AWS Amplify Console:
1. Go to App Settings → Domain Management
2. Add your domain
3. Configure DNS records as shown

---

### Option 3: Deploy with Docker

Most flexible - run anywhere that supports Docker.

#### 3.1 Create Dockerfile

Already exists at `client/Dockerfile` (if not, create it):

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEBSOCKET_URL=$NEXT_PUBLIC_WEBSOCKET_URL

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
```

#### 3.2 Build Docker Image

```bash
cd client

docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://YOUR-API-ID.execute-api.us-east-2.amazonaws.com \
  --build-arg NEXT_PUBLIC_WEBSOCKET_URL=wss://YOUR-WS-ID.execute-api.us-east-2.amazonaws.com/production \
  -t nephos-frontend:latest .
```

#### 3.3 Run Locally (Test)

```bash
docker run -p 3000:3000 nephos-frontend:latest
```

Open `http://localhost:3000` to test.

#### 3.4 Push to Container Registry

**Docker Hub:**
```bash
docker tag nephos-frontend:latest yourusername/nephos-frontend:latest
docker push yourusername/nephos-frontend:latest
```

**AWS ECR:**
```bash
# Create ECR repository
aws ecr create-repository --repository-name nephos-frontend

# Get login token
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin YOUR-ACCOUNT-ID.dkr.ecr.us-east-2.amazonaws.com

# Tag and push
docker tag nephos-frontend:latest YOUR-ACCOUNT-ID.dkr.ecr.us-east-2.amazonaws.com/nephos-frontend:latest
docker push YOUR-ACCOUNT-ID.dkr.ecr.us-east-2.amazonaws.com/nephos-frontend:latest
```

#### 3.5 Deploy to Any Docker Host

**AWS ECS:**
```bash
# Create ECS cluster, task definition, and service
# (See AWS ECS documentation for detailed steps)
```

**DigitalOcean App Platform:**
```bash
# Connect repository and configure via dashboard
```

**Any VPS with Docker:**
```bash
ssh user@your-server

# Pull and run
docker pull yourusername/nephos-frontend:latest
docker run -d -p 80:3000 --name nephos --restart always yourusername/nephos-frontend:latest
```

---

## Switching from Mock to Real Data

### Step 1: Deploy Backend

First, deploy your backend to AWS:

```bash
cd ../backend
sam build
sam deploy --guided
```

Copy the output URLs:
```
Outputs:
  AnalyticsApiEndpoint: https://abc123.execute-api.us-east-2.amazonaws.com/analytics
  WebSocketEndpoint: wss://xyz789.execute-api.us-east-2.amazonaws.com/production
```

### Step 2: Update Frontend Environment

**Local development:**
```bash
cd client
nano .env.local
```

Update with real URLs:
```env
NEXT_PUBLIC_API_URL=https://abc123.execute-api.us-east-2.amazonaws.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://xyz789.execute-api.us-east-2.amazonaws.com/production
```

**Vercel:**
```bash
vercel env rm NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_API_URL production
# Enter new value

vercel env rm NEXT_PUBLIC_WEBSOCKET_URL production
vercel env add NEXT_PUBLIC_WEBSOCKET_URL production
# Enter new value

# Redeploy
vercel --prod
```

**AWS Amplify:**
```bash
# Update environment variables in Amplify Console
# Then redeploy
amplify publish
```

**Docker:**
```bash
# Rebuild with new build args
docker build --build-arg NEXT_PUBLIC_API_URL=https://... -t nephos-frontend:latest .
```

### Step 3: Restart Application

**Development:**
```bash
# Stop current dev server (Ctrl+C)
npm run dev
```

**Production:**
- Vercel: Auto-deployed after env var change
- Amplify: Redeploy with `amplify publish`
- Docker: Restart container with new image

### Step 4: Verify Real Data

1. Open frontend URL
2. Navigate to "Instances" tab
3. Should see your actual Vultr instances (not mock data)
4. Check "Metrics" tab for real CPU/memory data
5. Verify WebSocket connection in browser console (should show "Connected")

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL for API Gateway | `https://abc123.execute-api.us-east-2.amazonaws.com` |
| `NEXT_PUBLIC_WEBSOCKET_URL` | WebSocket endpoint for real-time updates | `wss://xyz789.execute-api.us-east-2.amazonaws.com/production` |

**Important**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets here.

---

## Performance Optimization

### Enable Production Optimizations

**Build with optimizations:**
```bash
npm run build
```

This enables:
- Code splitting
- Tree shaking
- Minification
- Image optimization
- Font optimization

### Configure CDN (Vercel/Amplify)

Both Vercel and Amplify automatically configure CDN. For other hosts:

**CloudFront (AWS):**
1. Create CloudFront distribution
2. Point origin to your Next.js server
3. Configure cache behaviors for `/_next/static/*`

### Enable Compression

**Vercel/Amplify**: Automatic

**Docker/VPS**: Add nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Monitoring Production

### Vercel Analytics

Enable in Vercel dashboard:
1. Go to your project
2. Click "Analytics" tab
3. Enable Web Analytics

View metrics:
- Page views
- Top pages
- Top referrers
- Visitor demographics

### AWS CloudWatch (Amplify)

View logs:
```bash
aws logs tail /aws/amplify/nephosfrontend/prod --follow
```

### Custom Monitoring

Add to `client/app/lib/monitoring.ts`:

```typescript
export function trackError(error: Error, context?: any) {
  // Send to your monitoring service (e.g., Sentry, DataDog)
  console.error('Frontend Error:', error, context);

  // Optional: Send to backend
  fetch('/api/errors', {
    method: 'POST',
    body: JSON.stringify({ error: error.message, context }),
  });
}
```

Use in components:
```typescript
try {
  // Your code
} catch (error) {
  trackError(error, { component: 'Dashboard' });
}
```

---

## Troubleshooting

### Build Fails

**Error: "Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

**Error: "Out of memory"**
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Page Shows 404

**Check routes:**
- Next.js uses file-based routing
- `app/page.tsx` = `/`
- `app/dashboard/page.tsx` = `/dashboard`

**Verify build:**
```bash
npm run build
ls .next/server/app  # Should show all pages
```

### API Calls Fail

**CORS errors:**
- Backend must have CORS headers enabled
- Check API Gateway CORS configuration

**401 Unauthorized:**
- API Gateway may require authentication
- Check Lambda authorizer configuration

**Network error:**
```bash
# Test endpoint manually
curl https://YOUR-API-ID.execute-api.us-east-2.amazonaws.com/analytics/dashboard
```

### WebSocket Won't Connect

**Check WebSocket URL format:**
- Must start with `wss://` (not `https://`)
- Must include stage: `/production` or `/dev`

**Test WebSocket:**
```javascript
// In browser console
const ws = new WebSocket('wss://YOUR-WS-ID.execute-api.us-east-2.amazonaws.com/production');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);
```

**Check API Gateway WebSocket routes:**
- AWS Console → API Gateway
- Verify `$connect`, `$disconnect`, `$default` routes exist

---

## Rollback Plan

### Vercel

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback
```

### AWS Amplify

```bash
# List deployments
amplify console

# In web console: Click "Redeploy" on previous version
```

### Docker

```bash
# Pull previous version
docker pull yourusername/nephos-frontend:v1.0.0

# Stop current
docker stop nephos

# Run previous
docker run -d -p 80:3000 --name nephos yourusername/nephos-frontend:v1.0.0
```

---

## Cost Estimates

### Vercel (Hobby - Free)
- Free for personal projects
- Includes CDN, SSL, analytics
- 100 GB bandwidth/month
- Unlimited deployments

### Vercel (Pro - $20/month)
- Unlimited bandwidth
- Team collaboration
- Better build performance
- Priority support

### AWS Amplify
- Build: $0.01/minute (~$3/month)
- Hosting: $0.15/GB served (~$5-15/month)
- Free tier: 1,000 build minutes, 15 GB served

### Docker on VPS
- DigitalOcean Droplet: $6-12/month
- AWS EC2 t3.micro: ~$8/month
- Includes full server control

---

## Next Steps

After deployment:

1. **Set up monitoring**: Configure error tracking (Sentry, DataDog)
2. **Add custom domain**: Point your domain to deployment
3. **Configure analytics**: Track user behavior
4. **Set up CI/CD**: Auto-deploy on git push
5. **Enable HTTPS**: Should be automatic on Vercel/Amplify
6. **Test performance**: Use Lighthouse or PageSpeed Insights
7. **Set up alerts**: Get notified of downtime or errors

Your Nephos frontend is now live and monitoring your infrastructure in real-time!
