import { JSDOM } from 'jsdom';
import { getBrowserHeaders } from './headers.js';
import { enforceRateLimit, getRandomDelay, getDomainLimiter } from './rateLimiter.js';
import { fetchPageWithBrowser, shouldUseBrowser, isDomainKnownToUseCloudflare } from './browserCrawler.js';
import { getConfig } from './config.js';

export async function fetchPage(url, options = {}) {
  const config = getConfig();
  const {
    timeout = 30000,
    followRedirects = true,
    maxRedirects = 5,
    additionalHeaders = {},
    randomDelay = true,
    useBrowser = null, // null = auto-detect, true = force browser, false = force fetch
    browserOptions = {},
    forceRetry = false
  } = options;

  // Determine if we should use browser mode
  const shouldUseBrowserMode = 
    useBrowser === true || 
    (useBrowser === null && (
      isDomainKnownToUseCloudflare(url) ||
      (config.autoDetection.useBrowserOnError && forceRetry)
    ));

  // If explicitly requesting browser mode or auto-detected
  if (shouldUseBrowserMode && config.browser.enabled) {
    console.log(`Using browser mode for ${url}`);
    return await fetchPageWithBrowser(url, {
      timeout: browserOptions.timeout || config.browser.timeout,
      browserOptions: {
        headless: browserOptions.headless ?? config.browser.headless,
        viewport: browserOptions.viewport || config.browser.viewport,
        ...browserOptions
      },
      additionalHeaders,
      randomDelay
    });
  }

  // Standard fetch approach
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

    // Prepare headers
    const headers = {
      ...getBrowserHeaders(url),
      ...additionalHeaders
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        redirect: followRedirects ? 'follow' : 'manual',
        follow: maxRedirects
      });

      clearTimeout(timeoutId);

      const html = await response.text();
      const contentType = response.headers.get('content-type') || '';

      // Check if we should retry with browser due to Cloudflare
      if (config.features.browserFallback && 
          useBrowser !== false && 
          config.browser.enabled &&
          await shouldUseBrowser(response.status, html)) {
        
        console.log(`Detected Cloudflare challenge for ${url}, retrying with browser...`);
        return await fetchPageWithBrowser(url, {
          timeout: browserOptions.timeout || config.browser.timeout,
          browserOptions: {
            headless: browserOptions.headless ?? config.browser.headless,
            viewport: browserOptions.viewport || config.browser.viewport,
            ...browserOptions
          },
          additionalHeaders,
          randomDelay
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        url: response.url,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        html,
        contentType,
        usedBrowser: false
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    // If fetch fails and browser fallback is enabled, try browser mode
    if (config.features.browserFallback && 
        useBrowser !== false && 
        config.browser.enabled &&
        !shouldUseBrowserMode) {
      
      console.log(`Fetch failed for ${url}, retrying with browser...`);
      return await fetchPageWithBrowser(url, {
        timeout: browserOptions.timeout || config.browser.timeout,
        browserOptions: {
          headless: browserOptions.headless ?? config.browser.headless,
          viewport: browserOptions.viewport || config.browser.viewport,
          ...browserOptions
        },
        additionalHeaders,
        randomDelay
      });
    }

    return {
      success: false,
      url,
      error: error.message,
      errorType: error.name,
      usedBrowser: false
    };
  }
}

export function parseHTML(html) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    return {
      dom,
      document,
      window: dom.window
    };
  } catch (error) {
    throw new Error(`Failed to parse HTML: ${error.message}`);
  }
}

export function extractSEOData(html, url) {
  try {
    const { document } = parseHTML(html);
    
    // Extract title
    const title = document.querySelector('title')?.textContent || '';
    
    // Extract meta tags
    const metaTags = {};
    document.querySelectorAll('meta').forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) {
        metaTags[name] = content;
      }
    });
    
    // Extract headings
    const headings = {
      h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
      h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
      h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim())
    };
    
    // Extract links
    const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href'),
      isExternal: a.getAttribute('href')?.startsWith('http') && !a.getAttribute('href')?.includes(new URL(url).hostname)
    }));
    
    // Extract images
    const images = Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      title: img.getAttribute('title') || ''
    }));
    
    // Extract Open Graph data
    const openGraph = {};
    document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
      const property = meta.getAttribute('property').replace('og:', '');
      openGraph[property] = meta.getAttribute('content');
    });
    
    // Extract Twitter Card data
    const twitterCard = {};
    document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
      const name = meta.getAttribute('name').replace('twitter:', '');
      twitterCard[name] = meta.getAttribute('content');
    });
    
    // Extract structured data (JSON-LD)
    const structuredData = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        structuredData.push(JSON.parse(script.textContent));
      } catch (e) {
        // Invalid JSON, skip
      }
    });
    
    return {
      title,
      metaTags,
      headings,
      links: {
        total: links.length,
        internal: links.filter(l => !l.isExternal).length,
        external: links.filter(l => l.isExternal).length,
        sample: links.slice(0, 10)
      },
      images: {
        total: images.length,
        withAlt: images.filter(img => img.alt).length,
        sample: images.slice(0, 10)
      },
      openGraph,
      twitterCard,
      structuredData
    };
  } catch (error) {
    throw new Error(`Failed to extract SEO data: ${error.message}`);
  }
}