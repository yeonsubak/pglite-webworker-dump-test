import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@electric-sql/pglite",
    "@electric-sql/pglite-react",
  ],
  /* config options here */
};

export default nextConfig;
