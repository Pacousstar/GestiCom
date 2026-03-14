const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  // Désactiver tout le reste pour le test
};

module.exports = nextConfig;
