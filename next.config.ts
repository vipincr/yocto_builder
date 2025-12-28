import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // External packages for server components
  serverExternalPackages: ['dockerode', 'ssh2'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude native modules from server bundle
      config.externals = config.externals || [];
      config.externals.push({
        'dockerode': 'commonjs dockerode',
        'ssh2': 'commonjs ssh2',
      });
    }
    return config;
  },
};

export default nextConfig;
