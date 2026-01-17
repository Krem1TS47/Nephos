# Nephos

> Cloud monitoring dashboard for real-time health checks, latency tracking, and error log aggregation across distributed cloud services.

## Overview

Nephos is a comprehensive monitoring solution that provides:

- **Real-time Health Checks**: Continuous monitoring of cloud service endpoints
- **Latency Tracking**: Performance metrics and response time analytics
- **Error Log Aggregation**: Centralized error tracking and alerting
- **Analytics Dashboard**: Beautiful visualizations powered by Next.js
- **Scalable Architecture**: Serverless backend on AWS Lambda + DynamoDB + Snowflake

## Architecture

### Frontend
- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Deployment**: Vercel (recommended)

### Backend
- **Runtime**: Node.js 20 on AWS Lambda
- **API**: AWS API Gateway (HTTP API)
- **Database**: DynamoDB (real-time) + Snowflake (analytics)
- **Infrastructure**: Serverless Framework

### Key Components

1. **API Functions**: RESTful endpoints for metrics, alerts, and analytics
2. **Sentinel Function**: Scheduled health checker (runs every 5 minutes)
3. **ETL Pipeline**: DynamoDB → Snowflake data synchronization
4. **Dashboard**: Interactive monitoring interface

## Quick Start

### Prerequisites

- Node.js 20+
- AWS Account
- Snowflake Account
- AWS CLI configured

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Nephos

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Configuration

1. **Backend Setup**:
```bash
cd backend
cp .env.example .env
# Edit .env with your AWS and Snowflake credentials
```

2. **Frontend Setup**:
```bash
cd client
cp .env.example .env.local
# Edit .env.local with your API endpoint
```

3. **AWS Setup**:
```bash
chmod +x scripts/setup-aws.sh
./scripts/setup-aws.sh
```

4. **Snowflake Setup**:
```bash
chmod +x scripts/setup-snowflake.sh
./scripts/setup-snowflake.sh
# Execute generated SQL in Snowflake console
```

### Deploy Backend

```bash
cd backend
chmod +x scripts/deploy.sh
./scripts/deploy.sh dev us-east-1
```

### Deploy Frontend

```bash
cd client
npm run build
vercel --prod
```

### Local Development

**Backend**:
```bash
cd backend
./scripts/local-dev.sh
# API available at http://localhost:3000
```

**Frontend**:
```bash
cd client
npm run dev
# App available at http://localhost:3000
```

## Project Structure

```
Nephos/
├── backend/
│   ├── functions/
│   │   ├── api/
│   │   │   ├── metrics/        # Metrics API
│   │   │   ├── alerts/         # Alerts API
│   │   │   ├── analytics/      # Analytics API
│   │   │   └── instances/      # Instances API
│   │   ├── etl/
│   │   │   └── dynamodb-to-snowflake/  # ETL pipeline
│   │   └── sentinel/           # Health checker
│   ├── scripts/
│   │   ├── deploy.sh           # Deployment script
│   │   ├── local-dev.sh        # Local development
│   │   └── destroy.sh          # Cleanup script
│   ├── serverless.yml          # Infrastructure config
│   └── .env.example            # Environment template
├── client/
│   ├── src/                    # Next.js app
│   ├── public/                 # Static assets
│   └── .env.example            # Environment template
├── scripts/
│   ├── setup-aws.sh            # AWS setup helper
│   └── setup-snowflake.sh      # Snowflake setup helper
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI pipeline
│       ├── deploy-backend.yml  # Backend deployment
│       └── deploy-frontend.yml # Frontend deployment
├── DEPLOYMENT.md               # Detailed deployment guide
└── README.md                   # This file
```

## API Endpoints

### Metrics
- `GET /metrics` - List all metrics
- `POST /metrics` - Create metric
- `GET /metrics/{id}` - Get metric by ID

### Alerts
- `GET /alerts` - List all alerts
- `POST /alerts` - Create alert
- `GET /alerts/{id}` - Get alert by ID
- `PUT /alerts/{id}` - Update alert
- `DELETE /alerts/{id}` - Delete alert

### Analytics
- `GET /analytics` - Get analytics data
- `GET /analytics/dashboard` - Get dashboard data

### Instances
- `GET /instances` - List monitored instances
- `POST /instances` - Add instance
- `GET /instances/{id}` - Get instance
- `PUT /instances/{id}` - Update instance
- `DELETE /instances/{id}` - Delete instance

## Features

### Implemented
- ✅ Serverless infrastructure configuration
- ✅ DynamoDB tables for real-time data
- ✅ Snowflake integration for analytics
- ✅ CI/CD pipelines (GitHub Actions)
- ✅ Deployment scripts
- ✅ Environment configuration

### In Progress
- 🚧 Lambda function implementations
- 🚧 Frontend dashboard UI
- 🚧 Authentication and authorization
- 🚧 Real-time WebSocket updates

### Planned
- 📋 Custom alerting rules
- 📋 Slack/Email notifications
- 📋 Multi-region support
- 📋 Advanced analytics
- 📋 API documentation

## Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Quick Deploy

**Backend**:
```bash
cd backend
./scripts/deploy.sh prod us-east-1
```

**Frontend**:
```bash
cd client
vercel --prod
```

### CI/CD

Push to `main` branch to trigger automatic deployment:
```bash
git push origin main
```

## Monitoring

### CloudWatch Logs
```bash
serverless logs -f metricsApi --stage prod --tail
```

### Snowflake Analytics
Query the analytics views:
- `METRICS_HOURLY` - Hourly metric aggregations
- `ACTIVE_ALERTS` - Current active alerts
- `INSTANCE_HEALTH` - Latest health check status

## Configuration

### Environment Variables

See `.env.example` files in `backend/` and `client/` for all available configuration options.

### AWS Resources

The deployment creates:
- Lambda functions (6 total)
- DynamoDB tables (3 tables)
- API Gateway HTTP API
- CloudWatch log groups
- IAM roles and policies

### Costs

Estimated monthly costs for dev environment: **$10-45**

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed cost breakdown.

## Development

### Running Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd client
npm test
```

### Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd client
npm run lint
```

## Troubleshooting

### Common Issues

1. **Deployment fails**: Check AWS credentials and permissions
2. **Function timeout**: Increase timeout in serverless.yml
3. **Snowflake connection error**: Verify credentials in .env
4. **DynamoDB throttling**: Check table capacity settings

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed troubleshooting.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Your License Here]

## Support

For issues and questions:
- Open an issue on GitHub
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides

## Acknowledgments

Built for hackathon with:
- AWS Lambda & DynamoDB
- Snowflake
- Next.js
- Serverless Framework

---

**Happy Monitoring!** 📊✨
