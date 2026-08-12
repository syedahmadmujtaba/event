import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Slip uploads go through server actions; default 1MB body cap would
      // reject them before our own 5MB validation runs. Leave room for
      // multipart/form-data overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
