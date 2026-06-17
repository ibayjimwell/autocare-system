import { NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { sql } from 'drizzle-orm';

// ------------------------------------------------------------------
// GET /api – Get the health status of the API
// ------------------------------------------------------------------
export async function GET() {
  const startTime = new Date().toISOString();
  const healthCheck = {
    status: 'healthy',
    timestamp: startTime,
    uptime: process.uptime(),
    database: {
      status: 'unknown',
      latencyMs: 0,
    },
    environment: process.env.NODE_ENV || 'development',
  };

  // Test database connectivity
  try {
    const dbStart = Date.now();
    // Simple lightweight query – works on any PostgreSQL instance
    await Database.execute(sql`SELECT 1`);
    const dbLatency = Date.now() - dbStart;

    healthCheck.database.status = 'connected';
    healthCheck.database.latencyMs = dbLatency;
  } catch (error) {
    healthCheck.status = 'unhealthy';
    healthCheck.database.status = 'disconnected';
    healthCheck.database.latencyMs = -1;

    console.error('Database health check failed:', error);

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database connection failed',
        errorMessage: 'Unable to reach the database. Please check your connection string and network.',
        errorLog: error instanceof Error ? error.message : String(error),
        ...healthCheck,
      },
      { status: 503 } // Service Unavailable
    );
  }

  // If reach here, everything is healthy
  return NextResponse.json(
    {
      error: false,
      ...healthCheck,
    },
    { status: 200 }
  );
}