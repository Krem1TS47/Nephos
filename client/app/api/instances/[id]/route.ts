// Mock Instance by ID API Route
import { NextResponse } from 'next/server';
import type { Instance } from '@/app/types';

// Mock instances data (same as in parent route)
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
