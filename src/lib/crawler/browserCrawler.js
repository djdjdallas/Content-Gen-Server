import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { getBrowserHeaders } from './headers.js';
import { enforceRateLimit, getRandomDelay, getDomainLimiter } from './rateLimiter.js';

puppeteer.use(StealthPlugin());

class BrowserPool {
  constructor() {
    this.browsers = new Map();
    this.maxBrowsers = 3;
    this.browserIdleTime = 300000; // 5 minutes
    this.cleanupInterval = null;
    this.startCleanup();
  }

  async getBrowser(options = {}) {
    const key = JSON.stringify(options);
    
    if (this.browsers.has(key)) {
      const browserData = this.browsers.get(key);
      browserData.lastUsed = Date.now();
      return browserData.browser;
    }

    if (this.browsers.size >= this.maxBrowsers) {
      await this.closeLeastRecentlyUsed();
    }

    const browser = await this.createBrowser(options);
    this.browsers.set(key, {
      browser,
      lastUsed: Date.now(),
      options
    });

    return browser;
  }

  async createBrowser(options = {}) {
    const defaultArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows'
    ];

    const browserOptions = {
      headless: options.headless !== false ? 'new' : false,
      args: [...defaultArgs, ...(options.args || [])],
      defaultViewport: options.viewport || { width: 1366, height: 768 },
      ignoreHTTPSErrors: true,
      ...options
    };

    return await puppeteer.launch(browserOptions);
  }

  async closeLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, data] of this.browsers.entries()) {
      if (data.lastUsed < oldestTime) {
        oldestTime = data.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const browserData = this.browsers.get(oldestKey);
      await browserData.browser.close();
      this.browsers.delete(oldestKey);
    }
  }

  startCleanup() {
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();
      const toClose = [];

      for (const [key, data] of this.browsers.entries()) {
        if (now - data.lastUsed > this.browserIdleTime) {
          toClose.push(key);
        }
      }

      for (const key of toClose) {
        const browserData = this.browsers.get(key);
        try {
          await browserData.browser.close();
        } catch (error) {
          console.error('Error closing browser:', error);
        }
        this.browsers.delete(key);
      }
    }, 60000); // Check every minute
  }

  async closeAll() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const closePromises = [];
    for (const [key, data] of this.browsers.entries()) {
      closePromises.push(data.browser.close().catch(console.error));
    }
    
    await Promise.all(closePromises);
    this.browsers.clear();
  }
}

const browserPool = new BrowserPool();

// Cloudflare detection patterns
const CLOUDFLARE_INDICATORS = [
  'checking your browser',
  'cloudflare',
  'cf-browser-verification',
  'cf-challenge',
  'ray id',
  '__cf_bm',
  'please wait while we check your browser'
];

function isCloudflareChallenge(content) {
  const lowerContent = content.toLowerCase();
  return CLOUDFLARE_INDICATORS.some(indicator => 
    lowerContent.includes(indicator)
  );
}

function isCloudflareError(statusCode) {
  return [403, 503, 429].includes(statusCode);
}

export async function fetchPageWithBrowser(url, options = {}) {
  const {
    timeout = 60000,
    browserOptions = {},
    waitForSelector = null,
    waitForNavigation = true,
    additionalHeaders = {},
    randomDelay = true,
    maxRetries = 2
  } = options;

  let browser = null;
  let page = null;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const limiter = getDomainLimiter(domain);

      // Rate limiting per domain
      await limiter(async () => {
        await enforceRateLimit(domain);
      });

      // Random delay to appear more human-like
      if (randomDelay) {
        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
      }

      // Get browser from pool
      browser = await browserPool.getBrowser(browserOptions);
      page = await browser.newPage();

      // Set viewport and user agent
      if (browserOptions.viewport) {
        await page.setViewport(browserOptions.viewport);
      }

      // Set headers
      const headers = {
        ...getBrowserHeaders(url),
        ...additionalHeaders
      };
      await page.setExtraHTTPHeaders(headers);

      // Set timeout
      page.setDefaultTimeout(timeout);
      page.setDefaultNavigationTimeout(timeout);

      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: waitForNavigation ? ['networkidle2', 'domcontentloaded'] : 'domcontentloaded',
        timeout
      });

      if (!response) {
        throw new Error('No response received');
      }

      // Check for Cloudflare challenge
      const content = await page.content();
      if (isCloudflareChallenge(content)) {
        console.log(`Cloudflare challenge detected for ${url}, waiting...`);
        
        // Wait for challenge to resolve (up to 30 seconds)
        try {
          await page.waitForFunction(
            () => !document.body.innerHTML.toLowerCase().includes('checking your browser'),
            { timeout: 30000 }
          );
          
          // Wait a bit more for the page to fully load after challenge
          await page.waitForTimeout(3000);
        } catch (challengeError) {
          console.log('Cloudflare challenge timeout, proceeding anyway');
        }
      }

      // Wait for specific selector if provided
      if (waitForSelector) {
        try {
          await page.waitForSelector(waitForSelector, { timeout: 10000 });
        } catch (selectorError) {
          console.warn(`Selector ${waitForSelector} not found, proceeding anyway`);
        }
      }

      // Get final content and response details
      const finalContent = await page.content();
      const finalUrl = page.url();
      const status = response.status();
      const responseHeaders = response.headers();

      await page.close();

      return {
        success: true,
        url: finalUrl,
        status,
        headers: responseHeaders,
        html: finalContent,
        contentType: responseHeaders['content-type'] || '',
        usedBrowser: true
      };

    } catch (error) {
      console.error(`Browser fetch attempt ${retryCount + 1} failed for ${url}:`, error.message);
      
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          console.error('Error closing page:', closeError);
        }
      }

      retryCount++;
      
      if (retryCount <= maxRetries) {
        console.log(`Retrying browser fetch for ${url} (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
      }
    }
  }

  return {
    success: false,
    url,
    error: 'Browser fetch failed after all retries',
    errorType: 'BrowserError',
    usedBrowser: true
  };
}

export async function shouldUseBrowser(statusCode, responseContent = '') {
  // Use browser if we get Cloudflare-related status codes
  if (isCloudflareError(statusCode)) {
    return true;
  }

  // Use browser if content contains Cloudflare indicators
  if (responseContent && isCloudflareChallenge(responseContent)) {
    return true;
  }

  return false;
}

// Known domains that often use Cloudflare
export const CLOUDFLARE_DOMAINS = new Set([
  'discord.com',
  'reddit.com',
  'medium.com',
  'dev.to',
  'hashnode.com',
  'notion.so'
]);

export function isDomainKnownToUseCloudflare(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return CLOUDFLARE_DOMAINS.has(hostname) || 
           Array.from(CLOUDFLARE_DOMAINS).some(domain => hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing browser pool...');
  await browserPool.closeAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing browser pool...');
  await browserPool.closeAll();
  process.exit(0);
});

export { browserPool };