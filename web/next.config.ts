import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Item images are uploaded through a Server Action (bucket limit is 5 MB).
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
