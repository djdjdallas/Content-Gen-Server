import { getConfig } from '@/lib/crawler/config';
import { userAgents } from '@/lib/crawler/userAgents';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const config = getConfig();
    
    // Public configuration (safe to expose)
    const publicConfig = {
      version: '1.0.0',
      features: config.features,
      limits: {
        maxBatchSize: config.maxBatchSize,
        defaultTimeout: config.defaultTimeout,
        maxRedirects: config.maxRedirects,
        maxResponseSize: config.maxResponseSize
      },
      rateLimiting: {
        minDelayBetweenRequests: config.minDelayBetweenRequests,
        randomDelayRange: config.randomDelayRange
      },
      batch: {
        defaultConcurrency: config.defaultBatchConcurrency
      },
      userAgents: {
        count: userAgents.length,
        rotationEnabled: config.userAgentRotation
      },
      endpoints: {
        fetch: {
          method: 'POST',
          path: '/api/crawler/fetch',
          description: 'Fetch a single page with anti-blocking features',
          example: {
            url: 'https://example.com',
            options: {
              timeout: 30000,
              followRedirects: true,
              randomDelay: true
            }
          }
        },
        batch: {
          method: 'POST',
          path: '/api/crawler/batch',
          description: 'Batch fetch multiple URLs with rate limiting',
          example: {
            urls: ['https://example.com/page1', 'https://example.com/page2'],
            options: {
              concurrency: 3,
              timeout: 30000
            }
          }
        },
        seo: {
          method: 'POST',
          path: '/api/crawler/seo',
          description: 'Extract SEO metadata and analyze page',
          example: {
            url: 'https://example.com',
            options: {
              timeout: 30000
            }
          }
        }
      },
      n8nIntegration: config.n8nExamples
    };

    return NextResponse.json(publicConfig);
  } catch (error) {
    console.error('Config error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve configuration',
        message: error.message
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, { status: 200 });
}