import type { NextConfig } from "next";
import path from "path";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone", // pour livraison Option B : build autonome + lanceur (double-clic)
  // Forcer la racine de traçage = ce projet (évite multiple lockfiles → standalone vide)
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingExcludes: {
    "*": [
      "GestiCom-Portable/**",
      "gesticom/**",
      "backups/**",
      "GestiCom-Portable*.zip",
      "backup-*.db",
      "node_modules/@next/swc-win32-x64-gnu/**"
    ]
  },
  // Exclure le dossier gesticom du build
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
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
