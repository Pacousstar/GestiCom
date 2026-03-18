const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingExcludes: {
    '*': [
      'C:/gesticom/**',
      'C:/GestiCom/**',
      '**/gesticom.db*'
    ],
  },
};

module.exports = nextConfig;
