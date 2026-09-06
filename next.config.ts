import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The Daytona SDK resolves optional deps (e.g. form-data for file uploads)
  // via dynamic require() at runtime. Bundling breaks that, so keep it
  // external and load it from node_modules in the Node server runtime.
  serverExternalPackages: ["@daytona/sdk"],
}

export default nextConfig
