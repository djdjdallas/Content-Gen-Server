export const crawlerConfig = {
  // Rate limiting
  minDelayBetweenRequests: 1000, // 1 second
  randomDelayRange: [1000, 3000], // 1-3 seconds
  
  // Batch processing
  defaultBatchConcurrency: 3,
  maxBatchSize: 100,
  
  // Request settings
  defaultTimeout: 30000, // 30 seconds
  maxRedirects: 5,
  
  // User agents
  userAgentRotation: true,
  userAgentCount: 5,
  
  // Browser configuration
  browser: {
    enabled: true,
    headless: true,
    viewport: { width: 1366, height: 768 },
    timeout: 60000,
    maxBrowsers: 3,
    browserIdleTime: 300000, // 5 minutes
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ],
    cloudflareBypass: {
      enabled: true,
      maxWaitTime: 30000,
      retryDelay: 2000,
      maxRetries: 2
    }
  },

  // Auto-detection settings
  autoDetection: {
    useBrowserOnError: true,
    errorCodes: [403, 503, 429],
    cloudflareIndicators: [
      'checking your browser',
      'cloudflare',
      'cf-browser-verification',
      'cf-challenge',
      'ray id'
    ],
    knownCloudflaredomains: [
      'discord.com',
      'reddit.com',
      'medium.com',
      'dev.to',
      'hashnode.com',
      'notion.so'
    ]
  },

  // Features
  features: {
    rateLimiting: true,
    userAgentRotation: true,
    browserHeaders: true,
    randomDelay: true,
    domainThrottling: true,
    browserFallback: true,
    cloudflareBypass: true
  },
  
  // Limits
  maxResponseSize: 10 * 1024 * 1024, // 10MB
  
  // n8n integration examples
  n8nExamples: {
    webhook: {
      description: 'Send crawled data to n8n webhook',
      example: `
// In n8n webhook node:
// 1. Create a Webhook node
// 2. Set HTTP Method to POST
// 3. Use the webhook URL in your crawler API calls

// Example payload to send to n8n:
{
  "url": "https://example.com",
  "data": {
    "title": "Page Title",
    "metaTags": {...},
    "content": "..."
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
      `
    },
    httpRequest: {
      description: 'Call crawler API from n8n',
      example: `
// In n8n HTTP Request node:
// 1. Set URL to: https://your-domain.com/api/crawler/fetch
// 2. Set Method to: POST
// 3. Set Body Content Type to: JSON
// 4. Add body:
{
  "url": "{{ $json.url }}",
  "options": {
    "timeout": 30000,
    "randomDelay": true
  }
}
      `
    },
    batchProcessing: {
      description: 'Process multiple URLs in n8n',
      example: `
// Use Split in Batches node before HTTP Request:
// 1. Batch Size: 5
// 2. In HTTP Request node, use:
//    URL: https://your-domain.com/api/crawler/batch
//    Body: { "urls": {{ $json.urls }} }
      `
    }
  }
};

export function getConfig() {
  return crawlerConfig;
}