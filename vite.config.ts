import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    spa: {
      enabled: true,
    },
  },
  // Add this section to silence the chunk size warning
  vite: {
    build: {
      chunkSizeWarningLimit: 1600, // Increase the limit to 1.6MB
    },
  },
});
