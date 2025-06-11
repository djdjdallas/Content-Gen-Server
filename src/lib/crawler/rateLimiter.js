import pLimit from 'p-limit';

const domainLimiters = new Map();
const lastRequestTime = new Map();

export function getDomainLimiter(domain) {
  if (!domainLimiters.has(domain)) {
    domainLimiters.set(domain, pLimit(1));
  }
  return domainLimiters.get(domain);
}

export async function enforceRateLimit(domain) {
  const now = Date.now();
  const lastTime = lastRequestTime.get(domain) || 0;
  const timeSinceLastRequest = now - lastTime;
  const minDelay = 1000; // 1 second minimum between same domain requests
  
  if (timeSinceLastRequest < minDelay) {
    await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
  }
  
  lastRequestTime.set(domain, Date.now());
}

export function getRandomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}