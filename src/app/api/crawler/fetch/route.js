import { fetchPage } from '@/lib/crawler/crawler';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, options = {} } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the page with anti-blocking features
    const result = await fetchPage(url, options);

    // n8n webhook integration example (commented)
    /*
    if (options.webhookUrl) {
      await fetch(options.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          result,
          timestamp: new Date().toISOString()
        })
      });
    }
    */

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fetch error:', error);
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