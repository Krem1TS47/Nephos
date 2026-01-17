-- Nephos Snowflake Setup with Cortex AI
-- This script sets up the Snowflake schema, tables, and AI-powered stored procedures

-- ============================================================================
-- STEP 1: Create Database and Schema
-- ============================================================================

USE ROLE ACCOUNTADMIN;

CREATE DATABASE IF NOT EXISTS NEPHOS
  COMMENT = 'Nephos cloud monitoring batch layer';

USE DATABASE NEPHOS;

CREATE SCHEMA IF NOT EXISTS PUBLIC
  COMMENT = 'Main schema for Nephos data';

USE SCHEMA PUBLIC;

-- ============================================================================
-- STEP 2: Create Tables (matching DynamoDB structure)
-- ============================================================================

-- Metrics Table
CREATE OR REPLACE TABLE METRICS (
    ID VARCHAR(255) PRIMARY KEY,
    INSTANCE_ID VARCHAR(255) NOT NULL,
    TIMESTAMP TIMESTAMP_NTZ NOT NULL,
    METRIC_NAME VARCHAR(255) NOT NULL,
    METRIC_VALUE FLOAT NOT NULL,
    UNIT VARCHAR(50),
    TAGS VARIANT,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT metrics_pk PRIMARY KEY (ID)
);

-- Alerts Table
CREATE OR REPLACE TABLE ALERTS (
    ID VARCHAR(255) PRIMARY KEY,
    INSTANCE_ID VARCHAR(255) NOT NULL,
    ALERT_TYPE VARCHAR(100) NOT NULL,
    SEVERITY VARCHAR(50) NOT NULL,
    MESSAGE TEXT,
    STATUS VARCHAR(50) NOT NULL,
    CREATED_AT TIMESTAMP_NTZ NOT NULL,
    UPDATED_AT TIMESTAMP_NTZ NOT NULL,
    RESOLVED_AT TIMESTAMP_NTZ,
    CONSTRAINT alerts_pk PRIMARY KEY (ID)
);

-- Instances Table
CREATE OR REPLACE TABLE INSTANCES (
    ID VARCHAR(255) PRIMARY KEY,
    NAME VARCHAR(255) NOT NULL,
    TYPE VARCHAR(100) NOT NULL,
    STATUS VARCHAR(50) NOT NULL,
    REGION VARCHAR(100),
    ENDPOINT VARCHAR(500),
    METADATA VARIANT,
    CREATED_AT TIMESTAMP_NTZ NOT NULL,
    UPDATED_AT TIMESTAMP_NTZ NOT NULL,
    LAST_HEALTH_CHECK TIMESTAMP_NTZ,
    CONSTRAINT instances_pk PRIMARY KEY (ID)
);

-- AI Insights Table (stores AI-generated insights)
CREATE OR REPLACE TABLE AI_INSIGHTS (
    ID VARCHAR(255) PRIMARY KEY,
    INSIGHT_TYPE VARCHAR(100) NOT NULL,  -- pattern, anomaly, prediction
    SEVERITY VARCHAR(50),
    TITLE VARCHAR(500) NOT NULL,
    DESCRIPTION TEXT NOT NULL,
    AFFECTED_INSTANCES VARIANT,  -- Array of instance IDs
    METRICS_ANALYZED VARIANT,    -- Array of metric names
    CONFIDENCE_SCORE FLOAT,
    RECOMMENDATIONS TEXT,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    EXPIRES_AT TIMESTAMP_NTZ,
    METADATA VARIANT
);

-- ============================================================================
-- STEP 3: Create Indexes for Performance
-- ============================================================================

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_instance ON METRICS(INSTANCE_ID, TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON METRICS(METRIC_NAME, TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON METRICS(TIMESTAMP);

-- Alerts indexes
CREATE INDEX IF NOT EXISTS idx_alerts_instance ON ALERTS(INSTANCE_ID, CREATED_AT);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON ALERTS(STATUS, CREATED_AT);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON ALERTS(SEVERITY, CREATED_AT);

-- Instances indexes
CREATE INDEX IF NOT EXISTS idx_instances_status ON INSTANCES(STATUS);
CREATE INDEX IF NOT EXISTS idx_instances_type ON INSTANCES(TYPE);

-- ============================================================================
-- STEP 4: Create Analytical Views
-- ============================================================================

-- Hourly Metrics Aggregation
CREATE OR REPLACE VIEW METRICS_HOURLY AS
SELECT
    INSTANCE_ID,
    METRIC_NAME,
    DATE_TRUNC('HOUR', TIMESTAMP) AS HOUR,
    AVG(METRIC_VALUE) AS AVG_VALUE,
    MAX(METRIC_VALUE) AS MAX_VALUE,
    MIN(METRIC_VALUE) AS MIN_VALUE,
    STDDEV(METRIC_VALUE) AS STDDEV_VALUE,
    COUNT(*) AS SAMPLE_COUNT
FROM METRICS
GROUP BY INSTANCE_ID, METRIC_NAME, DATE_TRUNC('HOUR', TIMESTAMP);

-- Daily Metrics Aggregation
CREATE OR REPLACE VIEW METRICS_DAILY AS
SELECT
    INSTANCE_ID,
    METRIC_NAME,
    DATE_TRUNC('DAY', TIMESTAMP) AS DAY,
    AVG(METRIC_VALUE) AS AVG_VALUE,
    MAX(METRIC_VALUE) AS MAX_VALUE,
    MIN(METRIC_VALUE) AS MIN_VALUE,
    STDDEV(METRIC_VALUE) AS STDDEV_VALUE,
    COUNT(*) AS SAMPLE_COUNT
FROM METRICS
GROUP BY INSTANCE_ID, METRIC_NAME, DATE_TRUNC('DAY', TIMESTAMP);

-- Active Alerts View
CREATE OR REPLACE VIEW ACTIVE_ALERTS AS
SELECT *
FROM ALERTS
WHERE STATUS = 'active'
ORDER BY CREATED_AT DESC;

-- Instance Health Overview
CREATE OR REPLACE VIEW INSTANCE_HEALTH AS
SELECT
    i.ID,
    i.NAME,
    i.TYPE,
    i.STATUS,
    i.REGION,
    i.LAST_HEALTH_CHECK,
    COUNT(DISTINCT a.ID) AS ACTIVE_ALERTS_COUNT,
    AVG(CASE WHEN m.METRIC_NAME = 'cpu_usage' THEN m.METRIC_VALUE END) AS AVG_CPU,
    AVG(CASE WHEN m.METRIC_NAME = 'memory_usage_percent' THEN m.METRIC_VALUE END) AS AVG_MEMORY,
    MAX(m.TIMESTAMP) AS LAST_METRIC_TIME
FROM INSTANCES i
LEFT JOIN ALERTS a ON i.ID = a.INSTANCE_ID AND a.STATUS = 'active'
LEFT JOIN METRICS m ON i.ID = m.INSTANCE_ID
    AND m.TIMESTAMP > DATEADD(hour, -1, CURRENT_TIMESTAMP())
GROUP BY i.ID, i.NAME, i.TYPE, i.STATUS, i.REGION, i.LAST_HEALTH_CHECK;

-- ============================================================================
-- STEP 5: AI-Powered Stored Procedures using Snowflake Cortex
-- ============================================================================

-- Procedure 1: Pattern Analysis using Cortex AI
CREATE OR REPLACE PROCEDURE RUN_AI_PATTERN_ANALYSIS()
RETURNS STRING
LANGUAGE SQL
AS
$$
DECLARE
    pattern_analysis_result VARIANT;
    insights_text STRING;
BEGIN
    -- Analyze patterns in metrics over the last 24 hours
    LET metrics_summary := (
        SELECT OBJECT_AGG(
            METRIC_NAME,
            OBJECT_CONSTRUCT(
                'avg', AVG(METRIC_VALUE),
                'max', MAX(METRIC_VALUE),
                'min', MIN(METRIC_VALUE),
                'trend', REGR_SLOPE(METRIC_VALUE, EXTRACT(EPOCH FROM TIMESTAMP))
            )
        )
        FROM METRICS
        WHERE TIMESTAMP > DATEADD(day, -1, CURRENT_TIMESTAMP())
        GROUP BY METRIC_NAME
    );

    -- Use Cortex AI to analyze patterns
    LET ai_prompt := 'Analyze the following metrics data and identify any concerning patterns, trends, or anomalies. ' ||
                     'Focus on: 1) Unusual spikes or drops, 2) Trending issues, 3) Correlation between metrics. ' ||
                     'Provide specific, actionable insights. Data: ' || TO_JSON(:metrics_summary);

    -- Call Snowflake Cortex AI
    LET ai_response := SNOWFLAKE.CORTEX.COMPLETE(
        'mistral-large',
        :ai_prompt,
        OBJECT_CONSTRUCT('temperature', 0.3, 'max_tokens', 500)
    );

    -- Extract insights from AI response
    LET insights := PARSE_JSON(:ai_response):choices[0]:messages;

    -- Store insights
    INSERT INTO AI_INSIGHTS (
        ID,
        INSIGHT_TYPE,
        SEVERITY,
        TITLE,
        DESCRIPTION,
        AFFECTED_INSTANCES,
        METRICS_ANALYZED,
        CONFIDENCE_SCORE,
        CREATED_AT,
        EXPIRES_AT
    )
    SELECT
        UUID_STRING(),
        'pattern',
        CASE
            WHEN :insights ILIKE '%critical%' OR :insights ILIKE '%severe%' THEN 'high'
            WHEN :insights ILIKE '%warning%' OR :insights ILIKE '%concern%' THEN 'medium'
            ELSE 'low'
        END,
        'AI Pattern Analysis - ' || TO_VARCHAR(CURRENT_TIMESTAMP(), 'YYYY-MM-DD HH24:MI'),
        :insights,
        (SELECT ARRAY_AGG(DISTINCT INSTANCE_ID) FROM METRICS WHERE TIMESTAMP > DATEADD(day, -1, CURRENT_TIMESTAMP())),
        (SELECT ARRAY_AGG(DISTINCT METRIC_NAME) FROM METRICS WHERE TIMESTAMP > DATEADD(day, -1, CURRENT_TIMESTAMP())),
        0.85,
        CURRENT_TIMESTAMP(),
        DATEADD(day, 7, CURRENT_TIMESTAMP());

    RETURN 'Pattern analysis complete. Insights generated.';
END;
$$;

-- Procedure 2: Anomaly Detection using Cortex AI
CREATE OR REPLACE PROCEDURE RUN_AI_ANOMALY_DETECTION()
RETURNS STRING
LANGUAGE SQL
AS
$$
DECLARE
    anomaly_count INTEGER;
BEGIN
    -- Detect anomalies using statistical analysis and AI
    CREATE OR REPLACE TEMPORARY TABLE temp_anomalies AS
    WITH metric_stats AS (
        SELECT
            INSTANCE_ID,
            METRIC_NAME,
            AVG(METRIC_VALUE) AS avg_value,
            STDDEV(METRIC_VALUE) AS stddev_value
        FROM METRICS
        WHERE TIMESTAMP > DATEADD(day, -7, CURRENT_TIMESTAMP())
        GROUP BY INSTANCE_ID, METRIC_NAME
    ),
    recent_metrics AS (
        SELECT
            m.INSTANCE_ID,
            m.METRIC_NAME,
            m.METRIC_VALUE,
            m.TIMESTAMP,
            s.avg_value,
            s.stddev_value,
            ABS(m.METRIC_VALUE - s.avg_value) / NULLIF(s.stddev_value, 0) AS z_score
        FROM METRICS m
        JOIN metric_stats s ON m.INSTANCE_ID = s.INSTANCE_ID AND m.METRIC_NAME = s.METRIC_NAME
        WHERE m.TIMESTAMP > DATEADD(hour, -1, CURRENT_TIMESTAMP())
    )
    SELECT *
    FROM recent_metrics
    WHERE z_score > 3  -- 3 standard deviations = anomaly
    ORDER BY z_score DESC;

    -- Get count of anomalies
    SELECT COUNT(*) INTO :anomaly_count FROM temp_anomalies;

    -- If anomalies found, use AI to analyze them
    IF (:anomaly_count > 0) THEN
        LET anomaly_data := (
            SELECT OBJECT_AGG(
                INSTANCE_ID || '_' || METRIC_NAME,
                OBJECT_CONSTRUCT(
                    'value', METRIC_VALUE,
                    'avg', avg_value,
                    'deviation', z_score
                )
            )
            FROM temp_anomalies
        );

        LET ai_prompt := 'Analyze these detected anomalies in system metrics. ' ||
                         'Explain what might be causing them and suggest remediation steps. ' ||
                         'Anomalies detected: ' || TO_JSON(:anomaly_data);

        LET ai_response := SNOWFLAKE.CORTEX.COMPLETE(
            'mistral-large',
            :ai_prompt,
            OBJECT_CONSTRUCT('temperature', 0.3, 'max_tokens', 500)
        );

        LET insights := PARSE_JSON(:ai_response):choices[0]:messages;

        -- Store anomaly insights
        INSERT INTO AI_INSIGHTS (
            ID,
            INSIGHT_TYPE,
            SEVERITY,
            TITLE,
            DESCRIPTION,
            AFFECTED_INSTANCES,
            CONFIDENCE_SCORE,
            RECOMMENDATIONS,
            CREATED_AT,
            EXPIRES_AT
        )
        SELECT
            UUID_STRING(),
            'anomaly',
            'high',
            'Anomalies Detected - ' || :anomaly_count || ' metric(s)',
            :insights,
            (SELECT ARRAY_AGG(DISTINCT INSTANCE_ID) FROM temp_anomalies),
            0.90,
            'Review affected instances immediately',
            CURRENT_TIMESTAMP(),
            DATEADD(day, 1, CURRENT_TIMESTAMP());
    END IF;

    RETURN 'Anomaly detection complete. Found ' || :anomaly_count || ' anomalies.';
END;
$$;

-- Procedure 3: Predictive Analysis using Cortex AI
CREATE OR REPLACE PROCEDURE RUN_AI_PREDICTIVE_ANALYSIS()
RETURNS STRING
LANGUAGE SQL
AS
$$
BEGIN
    -- Analyze trends and predict future issues
    CREATE OR REPLACE TEMPORARY TABLE temp_trends AS
    SELECT
        INSTANCE_ID,
        METRIC_NAME,
        REGR_SLOPE(METRIC_VALUE, EXTRACT(EPOCH FROM TIMESTAMP)) AS trend_slope,
        AVG(METRIC_VALUE) AS current_avg,
        MAX(METRIC_VALUE) AS current_max
    FROM METRICS
    WHERE TIMESTAMP > DATEADD(day, -7, CURRENT_TIMESTAMP())
    GROUP BY INSTANCE_ID, METRIC_NAME
    HAVING trend_slope > 0.01  -- Positive trend (increasing)
    ORDER BY trend_slope DESC;

    -- Use AI to predict issues
    LET trends_data := (
        SELECT OBJECT_AGG(
            INSTANCE_ID || '_' || METRIC_NAME,
            OBJECT_CONSTRUCT(
                'trend', trend_slope,
                'current_avg', current_avg,
                'current_max', current_max
            )
        )
        FROM temp_trends
    );

    LET ai_prompt := 'Based on these metric trends, predict potential issues that might occur in the next 24-48 hours. ' ||
                     'Focus on metrics showing concerning upward trends. Provide specific predictions and preventive actions. ' ||
                     'Trends data: ' || TO_JSON(:trends_data);

    LET ai_response := SNOWFLAKE.CORTEX.COMPLETE(
        'mistral-large',
        :ai_prompt,
        OBJECT_CONSTRUCT('temperature', 0.4, 'max_tokens', 600)
    );

    LET predictions := PARSE_JSON(:ai_response):choices[0]:messages;

    -- Store predictions
    INSERT INTO AI_INSIGHTS (
        ID,
        INSIGHT_TYPE,
        SEVERITY,
        TITLE,
        DESCRIPTION,
        AFFECTED_INSTANCES,
        CONFIDENCE_SCORE,
        RECOMMENDATIONS,
        CREATED_AT,
        EXPIRES_AT
    )
    SELECT
        UUID_STRING(),
        'prediction',
        'medium',
        'Predictive Analysis - Next 24-48 hours',
        :predictions,
        (SELECT ARRAY_AGG(DISTINCT INSTANCE_ID) FROM temp_trends),
        0.75,
        'Monitor these instances closely',
        CURRENT_TIMESTAMP(),
        DATEADD(day, 2, CURRENT_TIMESTAMP());

    RETURN 'Predictive analysis complete. Predictions generated.';
END;
$$;

-- Procedure 4: Generate Summary Report
CREATE OR REPLACE PROCEDURE GENERATE_AI_SUMMARY_REPORT()
RETURNS STRING
LANGUAGE SQL
AS
$$
BEGIN
    -- Compile all recent insights into a summary
    LET all_insights := (
        SELECT OBJECT_CONSTRUCT(
            'patterns', ARRAY_AGG(DESCRIPTION) WITHIN GROUP (ORDER BY CREATED_AT DESC),
            'anomalies', (SELECT ARRAY_AGG(DESCRIPTION) FROM AI_INSIGHTS WHERE INSIGHT_TYPE = 'anomaly' AND CREATED_AT > DATEADD(day, -1, CURRENT_TIMESTAMP())),
            'predictions', (SELECT ARRAY_AGG(DESCRIPTION) FROM AI_INSIGHTS WHERE INSIGHT_TYPE = 'prediction' AND CREATED_AT > DATEADD(day, -1, CURRENT_TIMESTAMP()))
        )
        FROM AI_INSIGHTS
        WHERE INSIGHT_TYPE = 'pattern'
        AND CREATED_AT > DATEADD(day, -1, CURRENT_TIMESTAMP())
    );

    LET ai_prompt := 'Create an executive summary of the following AI-generated insights about system health. ' ||
                     'Make it concise, actionable, and prioritized by urgency. Insights: ' || TO_JSON(:all_insights);

    LET ai_response := SNOWFLAKE.CORTEX.COMPLETE(
        'mistral-large',
        :ai_prompt,
        OBJECT_CONSTRUCT('temperature', 0.2, 'max_tokens', 400)
    );

    RETURN PARSE_JSON(:ai_response):choices[0]:messages;
END;
$$;

-- ============================================================================
-- STEP 6: Create Scheduled Tasks for AI Analysis
-- ============================================================================

-- Run pattern analysis every hour
CREATE OR REPLACE TASK AI_PATTERN_ANALYSIS_TASK
    WAREHOUSE = NEPHOS_WH
    SCHEDULE = 'USING CRON 0 * * * * UTC'  -- Every hour
AS
    CALL RUN_AI_PATTERN_ANALYSIS();

-- Run anomaly detection every 15 minutes
CREATE OR REPLACE TASK AI_ANOMALY_DETECTION_TASK
    WAREHOUSE = NEPHOS_WH
    SCHEDULE = 'USING CRON */15 * * * * UTC'  -- Every 15 minutes
AS
    CALL RUN_AI_ANOMALY_DETECTION();

-- Run predictive analysis every 6 hours
CREATE OR REPLACE TASK AI_PREDICTIVE_ANALYSIS_TASK
    WAREHOUSE = NEPHOS_WH
    SCHEDULE = 'USING CRON 0 */6 * * * UTC'  -- Every 6 hours
AS
    CALL RUN_AI_PREDICTIVE_ANALYSIS();

-- Enable tasks (comment out initially, enable after testing)
-- ALTER TASK AI_PATTERN_ANALYSIS_TASK RESUME;
-- ALTER TASK AI_ANOMALY_DETECTION_TASK RESUME;
-- ALTER TASK AI_PREDICTIVE_ANALYSIS_TASK RESUME;

-- ============================================================================
-- STEP 7: Grant Permissions
-- ============================================================================

-- Grant permissions to NEPHOS_ROLE (created in setup-snowflake.sh)
GRANT USAGE ON DATABASE NEPHOS TO ROLE NEPHOS_ROLE;
GRANT USAGE ON SCHEMA NEPHOS.PUBLIC TO ROLE NEPHOS_ROLE;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA NEPHOS.PUBLIC TO ROLE NEPHOS_ROLE;
GRANT SELECT ON ALL VIEWS IN SCHEMA NEPHOS.PUBLIC TO ROLE NEPHOS_ROLE;
GRANT USAGE ON WAREHOUSE NEPHOS_WH TO ROLE NEPHOS_ROLE;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check tables
SHOW TABLES IN SCHEMA NEPHOS.PUBLIC;

-- Check views
SHOW VIEWS IN SCHEMA NEPHOS.PUBLIC;

-- Check procedures
SHOW PROCEDURES IN SCHEMA NEPHOS.PUBLIC;

-- Check tasks
SHOW TASKS IN SCHEMA NEPHOS.PUBLIC;

SELECT 'Snowflake setup complete with AI capabilities!' AS STATUS;
