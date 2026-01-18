// Mock Instances API Route
import { NextResponse } from 'next/server';
import type { Instance, InstancesListResponse } from '@/app/types';

// Mock instances data
const mockInstances: Instance[] = [
  {
    id: '17b0f286-a9e8-4a4d-a1db-54b74cb97cc3',
    name: 'Vultr Los Angeles Server',
    provider: 'vultr',
    region: 'lax',
    status: 'healthy',
    endpoint: 'http://45.63.55.207',
    lastHealthCheck: new Date(Date.now() - 60000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 60000).toISOString(),
    metadata: {
      instanceType: 'vultr-compute',
      os: 'Alma Linux 8 x64',
      ipAddress: '45.63.55.207',
    },
  },
  {
    id: 'inst-002',
    name: 'prod-api-nyc-01',
    provider: 'vultr',
    region: 'ewr',
    status: 'healthy',
    endpoint: 'https://api.nephos-prod.com',
    lastHealthCheck: new Date(Date.now() - 45000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 125).toISOString(),
    updatedAt: new Date(Date.now() - 45000).toISOString(),
    metadata: {
      instanceType: 'vc2-4c-8gb',
      os: 'Ubuntu 22.04 LTS',
      ipAddress: '149.248.17.203',
    },
  },
  {
    id: 'inst-003',
    name: 'db-primary-virginia',
    provider: 'aws',
    region: 'us-east-1',
    status: 'degraded',
    endpoint: 'https://db-primary.nephos-prod.com',
    lastHealthCheck: new Date(Date.now() - 90000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 180).toISOString(),
    updatedAt: new Date(Date.now() - 90000).toISOString(),
    metadata: {
      instanceType: 't3.xlarge',
      os: 'Amazon Linux 2023',
      ipAddress: '52.23.178.142',
    },
  },
  {
    id: 'inst-004',
    name: 'redis-cache-la-02',
    provider: 'vultr',
    region: 'lax',
    status: 'unhealthy',
    endpoint: 'https://cache-la.nephos-prod.com',
    lastHealthCheck: new Date(Date.now() - 300000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
    metadata: {
      instanceType: 'vhf-4c-16gb',
      os: 'Debian 12 x64',
      ipAddress: '45.32.194.87',
    },
  },
  {
    id: 'inst-005',
    name: 'worker-oregon-03',
    provider: 'aws',
    region: 'us-west-2',
    status: 'healthy',
    endpoint: 'https://worker-pdx.nephos-prod.com',
    lastHealthCheck: new Date(Date.now() - 30000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 30000).toISOString(),
    metadata: {
      instanceType: 't3.2xlarge',
      os: 'Ubuntu 24.04 LTS',
      ipAddress: '54.201.88.229',
    },
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const lastEvaluatedKey = searchParams.get('lastEvaluatedKey');

    // Filter by status if provided
    let filteredInstances = mockInstances;
    if (status) {
      filteredInstances = mockInstances.filter((inst) => inst.status === status);
    }

    // Handle pagination
    const parsedLimit = limit ? parseInt(limit, 10) : filteredInstances.length;
    const startIndex = lastEvaluatedKey
      ? filteredInstances.findIndex((inst) => inst.id === lastEvaluatedKey) + 1
      : 0;
    const paginatedInstances = filteredInstances.slice(
      startIndex,
      startIndex + parsedLimit
    );

    const response: InstancesListResponse = {
      instances: paginatedInstances,
      lastEvaluatedKey:
        startIndex + parsedLimit < filteredInstances.length
          ? paginatedInstances[paginatedInstances.length - 1].id
          : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching instances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instances' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Create a new instance (mock)
    const newInstance: Instance = {
      id: `inst-${Date.now()}`,
      name: body.name,
      provider: body.provider,
      region: body.region,
      status: 'healthy',
      endpoint: body.endpoint,
      lastHealthCheck: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: body.metadata || {},
    };

    return NextResponse.json(newInstance, { status: 201 });
  } catch (error) {
    console.error('Error creating instance:', error);
    return NextResponse.json(
      { error: 'Failed to create instance' },
      { status: 500 }
    );
  }
}
