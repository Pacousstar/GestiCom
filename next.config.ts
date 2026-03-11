import type { NextConfig } from "next";
import path from "path";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Exclure le dossier gesticom du build et configurer webpack
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // OBFUSCATION (Seulement en production)
    if (!dev) {
      const WebpackObfuscator = require('webpack-obfuscator');
      config.plugins.push(
        new WebpackObfuscator({
          rotateStringArray: true,
          stringArray: true,
          stringArrayThreshold: 0.75,
          controlFlowFlattening: false, // Désactivé car trop gourmand/instable
          deadCodeInjection: false,     // Désactivé pour la stabilité
          debugProtection: false,      // Désactivé pour éviter les blocages environnementaux
          selfDefending: false,        // Désactivé pour la compatibilité
          identifierNamesGenerator: 'hexadecimal',
        }, [
          '**/node_modules/**',
          '**/static/**',
        ])
      );
    }

    // STOPPER LA BOUCLE DE FAST REFRESH
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/*.db', '**/*.db-journal', '**/backups/**'],
      };
    }
    return config;
  },
};

const pwaConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // Désactiver en développement pour éviter les problèmes
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "offlineCache",
          expiration: {
            maxEntries: 200,
          },
        },
      },
    ],
  },
});

export default pwaConfig(nextConfig);
