# Sentinel Lambda Function

Active health monitoring and Vultr API integration for Nephos cloud monitoring.

## Purpose

The Sentinel function serves as a **watchdog** for your cloud infrastructure by:

1. **Monitoring Vultr Instances** - Fetches instance status via Vultr API
2. **Active Health Checks** - Pings HTTP/HTTPS endpoints to verify availability
3. **Latency Tracking** - Measures response times for performance monitoring
4. **Status Updates** - Keeps DynamoDB instance records current
5. **Alert Generation** - Creates alerts for unhealthy or degraded instances
6. **Critical Notifications** - Sends SNS alerts for critical failures

## Trigger

- **CloudWatch Events** - Runs every 2 minutes (configurable)
- Can also be invoked manually for testing

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VULTR_API_KEY` | Yes | Vultr API authentication key |
| `DYNAMODB_TABLE_INSTANCES` | Yes | DynamoDB table for instance records |
| `DYNAMODB_TABLE_METRICS` | Yes | DynamoDB table for metrics |
| `DYNAMODB_TABLE_ALERTS` | Yes | DynamoDB table for alerts |
| `SNS_TOPIC_ARN` | No | SNS topic for critical alerts |
| `HEALTH_CHECK_TIMEOUT` | No | HTTP timeout in ms (default: 5000) |

## How It Works

```
1. Fetch all instances from DynamoDB
   ↓
2. Query Vultr API for instance status
   ↓
3. For each instance:
   a. Perform HTTP health check (if endpoint exists)
   b. Measure response time
   c. Determine status: healthy/unhealthy/degraded
   ↓
4. Update instance status in DynamoDB
   ↓
5. Store latency metrics
   ↓
6. Generate alerts for failures
   ↓
7. Send SNS notifications for critical issues
```

## Health Status Logic

| Condition | Status |
|-----------|--------|
| HTTP 2xx/3xx, latency < 1s, Vultr=active | **healthy** |
| HTTP 2xx/3xx, latency 1-3s | **degraded** |
| HTTP 4xx/5xx or timeout | **unhealthy** |
| No response | **unhealthy** |

## Local Testing

```bash
# Install dependencies
npm install

# Set environment variables
export VULTR_API_KEY="your-api-key"
export DYNAMODB_TABLE_INSTANCES="CloudPulseInstances-dev"
export DYNAMODB_TABLE_METRICS="CloudPulseMetrics-dev"
export DYNAMODB_TABLE_ALERTS="CloudPulseAlerts-dev"
export SNS_TOPIC_ARN="arn:aws:sns:us-east-2:xxx:nephos-alerts-dev"
export AWS_REGION="us-east-2"

# Test locally with SAM
sam local invoke SentinelFunction --event event.json

# Or invoke deployed function
aws lambda invoke \
  --function-name nephos-sentinel-dev \
  --region us-east-2 \
  --log-type Tail \
  output.json
```

## Sample Event

Create `event.json`:
```json
{
  "source": "aws.events",
  "detail-type": "Scheduled Event",
  "time": "2024-01-17T10:00:00Z"
}
```

## Monitoring

### View Logs
```bash
# Tail logs
sam logs -n SentinelFunction --stack-name nephos-backend-dev --tail

# Or via AWS CLI
aws logs tail /aws/lambda/nephos-sentinel-dev --follow --region us-east-2
```

### Metrics to Watch
- Invocations per minute
- Duration (should be < 30s)
- Errors (should be 0)
- Concurrent executions

### CloudWatch Alarms (Recommended)

```bash
# Alert on function errors
aws cloudwatch put-metric-alarm \
  --alarm-name sentinel-errors \
  --alarm-description "Alert on Sentinel function errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=nephos-sentinel-dev \
  --region us-east-2
```

## Alert Examples

### Instance Down Alert
```json
{
  "id": "alert-instance-4-1705491234567",
  "instanceId": "instance-4",
  "alertType": "instance_down",
  "severity": "critical",
  "message": "Instance Cache Server is unhealthy: Connection timeout",
  "status": "active",
  "createdAt": "2024-01-17T10:30:45Z"
}
```

### Performance Degradation Alert
```json
{
  "id": "alert-instance-2-1705491234568",
  "instanceId": "instance-2",
  "alertType": "performance_degradation",
  "severity": "high",
  "message": "Instance API Gateway is degraded: High latency: 2345ms",
  "status": "active",
  "createdAt": "2024-01-17T10:30:46Z"
}
```

## Dependencies

- `aws-sdk@^2.x` - AWS service interactions
- `axios@^1.x` - HTTP client for health checks and Vultr API
- `winston@^3.x` - Structured logging

## Configuration

### Adjust Check Frequency

In `template.yaml`:
```yaml
Events:
  ScheduledCheck:
    Type: Schedule
    Properties:
      Schedule: rate(2 minutes)  # Change to 1 minute, 5 minutes, etc.
```

### Adjust Health Check Timeout

Set environment variable:
```yaml
Environment:
  Variables:
    HEALTH_CHECK_TIMEOUT: 10000  # 10 seconds
```

## Troubleshooting

### Issue: Vultr API Rate Limiting
**Solution:** Increase schedule interval or cache Vultr data

### Issue: Health Checks Timeout
**Solution:** Increase `HEALTH_CHECK_TIMEOUT` or Lambda timeout

### Issue: Too Many False Alerts
**Solution:** Adjust latency thresholds in code or add retry logic

### Issue: DynamoDB Throttling
**Solution:** Enable auto-scaling or use provisioned capacity

## Best Practices

1. ✅ Monitor function duration and errors
2. ✅ Set up CloudWatch alarms for critical metrics
3. ✅ Review logs daily for anomalies
4. ✅ Test with various instance endpoints
5. ✅ Keep Vultr API key secure (use Secrets Manager)
6. ✅ Subscribe to SNS topic for critical alerts
7. ✅ Regularly review and tune health check thresholds

## Future Enhancements

- [ ] Add retry logic for transient failures
- [ ] Implement circuit breaker pattern
- [ ] Support custom health check endpoints
- [ ] Add SSL certificate validation
- [ ] DNS resolution checks
- [ ] Port availability checks
- [ ] Multi-region support
- [ ] Custom alert thresholds per instance

---

**Part of Nephos Cloud Monitoring System**
