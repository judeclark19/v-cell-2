import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true
  },
  transpilePackages: ["@vcell/engine", "@vcell/ui"]
};

export default nextConfig;
