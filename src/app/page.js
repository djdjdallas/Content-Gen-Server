export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <main className="text-center p-8">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          MXS Solutions
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Web Scraper API Service
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
            API Endpoints
          </h2>
          <div className="space-y-2 text-left">
            <div className="text-sm">
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                GET /api/crawler/health
              </code>
            </div>
            <div className="text-sm">
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                POST /api/crawler/fetch
              </code>
            </div>
            <div className="text-sm">
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                POST /api/crawler/batch
              </code>
            </div>
            <div className="text-sm">
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                GET /api/crawler/config
              </code>
            </div>
            <div className="text-sm">
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                POST /api/crawler/seo
              </code>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
          For internal use with n8n automation
        </p>
      </main>
    </div>
  );
}
