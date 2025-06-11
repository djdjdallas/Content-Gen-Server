import { batchFetch } from '@/lib/crawler/batchProcessor';
import { crawlerConfig } from '@/lib/crawler/config';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { urls, options = {} } = body;

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      );
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array cannot be empty' },
        { status: 400 }
      );
    }

    if (urls.length > crawlerConfig.maxBatchSize) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum limit of ${crawlerConfig.maxBatchSize}` },
        { status: 400 }
      );
    }

    // Validate all URLs
    const invalidUrls = [];
    urls.forEach((url, index) => {
      try {
        new URL(url);
      } catch (error) {
        invalidUrls.push({ index, url });
      }
    });

    if (invalidUrls.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid URLs detected',
          invalidUrls 
        },
        { status: 400 }
      );
    }

    // Process batch with progress tracking
    const results = await batchFetch(urls, {
      ...options,
      onProgress: (progress) => {
        // Could implement SSE or WebSocket for real-time progress
        console.log(`Batch progress: ${progress.percentage.toFixed(2)}% (${progress.completed}/${progress.total})`);
      }
    });

    // Summary statistics
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      averageResponseTime: null // Could be calculated if we track timing
    };

    // n8n batch processing example (commented)
    /*
    // Example: Send batch results to n8n webhook
    if (options.webhookUrl) {
      await fetch(options.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: Date.now().toString(),
          results,
          summary,
          timestamp: new Date().toISOString()
        })
      });
    }
    */

    return NextResponse.json({
      results,
      summary
    });
  } catch (error) {
    console.error('Batch fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, { status: 200 });
}