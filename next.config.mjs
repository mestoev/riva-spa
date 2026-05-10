/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "cdn.riva.spa" },
    ],
  },
  experimental: {
    serverActions: {
      // Stable encryption key so Server Action IDs survive a redeploy.
      // Without this, every `next build` regenerates the keys and any
      // open browser tab using a previous build will see "Failed to find
      // Server Action" errors and get redirected away on form submits.
      // Set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY in env on the prod server
      // to override; otherwise the literal below is used.
      encryptionKey:
        process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY ||
        "riva-spa-stable-server-actions-key-do-not-change-after-prod",
    },
  },
};

export default nextConfig;
