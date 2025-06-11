import { getConfig } from '@/lib/crawler/config';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const config = getConfig();
    
    // Check if core dependencies are available
    const healthChecks = {
      jsdom: false,
      pLimit: false,
      fetch: false
    };

    // Test JSDOM
    try {
      const { JSDOM } = await import('jsdom');
      new JSDOM('<html></html>');
      healthChecks.jsdom = true;
    } catch (error) {
      console.error('JSDOM check failed:', error);
    }

    // Test p-limit
    try {
      const pLimit = await import('p-limit');
      const limit = pLimit.default(1);
      await limit(() => Promise.resolve());
      healthChecks.pLimit = true;
    } catch (error) {
      console.error('p-limit check failed:', error);
    }

    // Test fetch
    try {
      healthChecks.fetch = typeof fetch === 'function';
    } catch (error) {
      console.error('Fetch check failed:', error);
    }

    const allHealthy = Object.values(healthChecks).every(check => check === true);
    
    const response = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks: healthChecks,
      features: config.features,
      limits: {
        maxBatchSize: config.maxBatchSize,
        defaultTimeout: config.defaultTimeout,
        maxRedirects: config.maxRedirects
      }
    };

    return NextResponse.json(response, {
      status: allHealthy ? 200 : 503
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, { status: 200 });
}