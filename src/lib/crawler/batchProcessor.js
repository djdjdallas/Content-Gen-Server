import pLimit from 'p-limit';
import { fetchPage } from './crawler.js';

export async function batchFetch(urls, options = {}) {
  const {
    concurrency = 3,
    onProgress,
    ...fetchOptions
  } = options;

  const limit = pLimit(concurrency);
  const results = [];
  let completed = 0;

  const tasks = urls.map((url, index) => 
    limit(async () => {
      try {
        const result = await fetchPage(url, fetchOptions);
        completed++;
        
        if (onProgress) {
          onProgress({
            completed,
            total: urls.length,
            percentage: (completed / urls.length) * 100,
            currentUrl: url
          });
        }
        
        return {
          index,
          url,
          ...result
        };
      } catch (error) {
        completed++;
        
        if (onProgress) {
          onProgress({
            completed,
            total: urls.length,
            percentage: (completed / urls.length) * 100,
            currentUrl: url
          });
        }
        
        return {
          index,
          url,
          success: false,
          error: error.message
        };
      }
    })
  );

  const batchResults = await Promise.all(tasks);
  
  // Sort by original index to maintain order
  return batchResults.sort((a, b) => a.index - b.index);
}