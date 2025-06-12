/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize packages that should only run on server
      config.externals.push({
        'puppeteer-extra': 'commonjs puppeteer-extra',
        'puppeteer-extra-plugin-stealth': 'commonjs puppeteer-extra-plugin-stealth',
        'puppeteer-core': 'commonjs puppeteer-core',
        'puppeteer': 'commonjs puppeteer',
        'clone-deep': 'commonjs clone-deep',
        'merge-deep': 'commonjs merge-deep'
      });
    }
    
    // Ignore dynamic require warnings for these packages
    config.module = config.module || {};
    config.module.unknownContextCritical = false;
    config.module.exprContextCritical = false;
    
    return config;
  },
  serverExternalPackages: [
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth', 
    'puppeteer-core',
    'puppeteer'
  ]
};

export default nextConfig;
