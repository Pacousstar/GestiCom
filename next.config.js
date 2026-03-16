const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname),
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  // Désactiver tout le reste pour le test
};

module.exports = nextConfig;
