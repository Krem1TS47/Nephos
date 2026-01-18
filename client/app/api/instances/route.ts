// Mock Instances API Route
import { NextResponse } from 'next/server';
import type { Instance, InstancesListResponse } from '@/app/types';

// Mock instances data
const mockInstances: Instance[] = [
  {
    id: 'inst-001',
    name: 'web-server-01',
    provider: 'vultr',
    region: 'ewr',
    status: 'healthy',
    endpoint: 'https://web1.example.com',
    lastHealthCheck: new Date(Date.now() - 60000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 60000).toISOString(),
    metadata: {
      instanceType: 'vc2-1c-1gb',
      os: 'Ubuntu 22.04',
      ipAddress: '45.76.123.45',
    },
  },
  {
    id: 'inst-002',
    name: 'api-server-01',
    provider: 'vultr',
    region: 'ewr',
    status: 'healthy',
    endpoint: 'https://api1.example.com',
    lastHealthCheck: new Date(Date.now() - 45000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 45000).toISOString(),
    metadata: {
      instanceType: 'vc2-2c-4gb',
      os: 'Ubuntu 22.04',
      ipAddress: '45.76.123.46',
    },
  },
  {
    id: 'inst-003',
    name: 'db-server-01',
    provider: 'aws',
    region: 'us-east-1',
    status: 'degraded',
    endpoint: 'https://db1.example.com',
    lastHealthCheck: new Date(Date.now() - 90000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 90000).toISOString(),
    metadata: {
      instanceType: 't3.medium',
      os: 'Amazon Linux 2',
      ipAddress: '52.23.45.67',
    },
  },
  {
    id: 'inst-004',
    name: 'cache-server-01',
    provider: 'vultr',
    region: 'lax',
    status: 'unhealthy',
    endpoint: 'https://cache1.example.com',
    lastHealthCheck: new Date(Date.now() - 300000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
    metadata: {
      instanceType: 'vhf-2c-4gb',
      os: 'Ubuntu 22.04',
      ipAddress: '45.77.234.89',
    },
  },
  {
    id: 'inst-005',
    name: 'worker-server-01',
    provider: 'aws',
    region: 'us-west-2',
    status: 'healthy',
    endpoint: 'https://worker1.example.com',
    lastHealthCheck: new Date(Date.now() - 30000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 30000).toISOString(),
    metadata: {
      instanceType: 't3.large',
      os: 'Amazon Linux 2',
      ipAddress: '54.201.123.45',
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
