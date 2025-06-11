'use client';

import { useState } from 'react';

export default function CrawlerDashboard() {
  const [activeTab, setActiveTab] = useState('fetch');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Form states
  const [fetchUrl, setFetchUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [seoUrl, setSeoUrl] = useState('');

  const handleFetch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/crawler/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: fetchUrl,
          options: {
            timeout: 30000,
            randomDelay: true
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const urls = batchUrls.split('\n').map(url => url.trim()).filter(url => url);
      
      const response = await fetch('/api/crawler/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          urls,
          options: {
            concurrency: 3,
            timeout: 30000
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to batch fetch');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSEO = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/crawler/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: seoUrl,
          options: {
            timeout: 30000
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to analyze SEO');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/crawler/health');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getConfig = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/crawler/config');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Web Crawler Dashboard</h1>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {['fetch', 'batch', 'seo', 'health', 'config'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {activeTab === 'fetch' && 'Fetch Single Page'}
              {activeTab === 'batch' && 'Batch Fetch URLs'}
              {activeTab === 'seo' && 'SEO Analysis'}
              {activeTab === 'health' && 'Health Check'}
              {activeTab === 'config' && 'Configuration'}
            </h2>

            {activeTab === 'fetch' && (
              <form onSubmit={handleFetch} className="space-y-4">
                <div>
                  <label htmlFor="fetch-url" className="block text-sm font-medium text-gray-700">
                    URL to fetch
                  </label>
                  <input
                    type="url"
                    id="fetch-url"
                    value={fetchUrl}
                    onChange={(e) => setFetchUrl(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Fetching...' : 'Fetch Page'}
                </button>
              </form>
            )}

            {activeTab === 'batch' && (
              <form onSubmit={handleBatch} className="space-y-4">
                <div>
                  <label htmlFor="batch-urls" className="block text-sm font-medium text-gray-700">
                    URLs (one per line)
                  </label>
                  <textarea
                    id="batch-urls"
                    value={batchUrls}
                    onChange={(e) => setBatchUrls(e.target.value)}
                    rows={6}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Batch Fetch'}
                </button>
              </form>
            )}

            {activeTab === 'seo' && (
              <form onSubmit={handleSEO} className="space-y-4">
                <div>
                  <label htmlFor="seo-url" className="block text-sm font-medium text-gray-700">
                    URL to analyze
                  </label>
                  <input
                    type="url"
                    id="seo-url"
                    value={seoUrl}
                    onChange={(e) => setSeoUrl(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Analyze SEO'}
                </button>
              </form>
            )}

            {activeTab === 'health' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Check the health status of the crawler service and its dependencies.
                </p>
                <button
                  onClick={checkHealth}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Checking...' : 'Check Health'}
                </button>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  View the current crawler configuration and API documentation.
                </p>
                <button
                  onClick={getConfig}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Get Configuration'}
                </button>
              </div>
            )}
          </div>

          {/* Result Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Result</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-gray-50 rounded-md p-4 overflow-auto max-h-96">
                <pre className="text-xs text-gray-800">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}

            {!error && !result && !loading && (
              <p className="text-sm text-gray-500">Results will appear here...</p>
            )}
          </div>
        </div>

        {/* n8n Integration Examples */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">n8n Integration Examples</h2>
          <div className="prose prose-sm max-w-none">
            <h3>Using the Crawler API in n8n:</h3>
            <ol>
              <li>Create an HTTP Request node</li>
              <li>Set the URL to: <code>https://your-domain.com/api/crawler/[endpoint]</code></li>
              <li>Set Method to POST</li>
              <li>Add your request body in JSON format</li>
            </ol>
            <h3>Example Workflows:</h3>
            <ul>
              <li><strong>SEO Monitoring:</strong> Schedule daily SEO checks and alert on score drops</li>
              <li><strong>Content Changes:</strong> Monitor competitor websites for updates</li>
              <li><strong>Data Extraction:</strong> Extract product information from e-commerce sites</li>
              <li><strong>Link Validation:</strong> Check all links on your website for 404 errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}