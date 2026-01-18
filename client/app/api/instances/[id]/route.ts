// Mock Instance by ID API Route
import { NextResponse } from 'next/server';
import type { Instance } from '@/app/types';

// Mock instances data (same as in parent route)
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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const instance = mockInstances.find((inst) => inst.id === params.id);

    if (!instance) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(instance);
  } catch (error) {
    console.error('Error fetching instance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instance' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const instance = mockInstances.find((inst) => inst.id === params.id);

    if (!instance) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }

    // Update instance (mock)
    const updatedInstance: Instance = {
      ...instance,
      ...body,
      id: params.id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(updatedInstance);
  } catch (error) {
    console.error('Error updating instance:', error);
    return NextResponse.json(
      { error: 'Failed to update instance' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const instance = mockInstances.find((inst) => inst.id === params.id);

    if (!instance) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting instance:', error);
    return NextResponse.json(
      { error: 'Failed to delete instance' },
      { status: 500 }
    );
  }
}
