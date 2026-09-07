import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, Plugin } from "vite";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

let validationCache: {
  key: string;
  secret: string;
  url: string;
  isValid: boolean;
  checkedAt: number;
} | null = null;

async function validateLiveKitCredentials(
  livekitUrl: string,
  apiKey: string,
  apiSecret: string
): Promise<boolean> {
  if (!livekitUrl || !apiKey || !apiSecret) return false;
  if (livekitUrl.includes("placeholder") || apiKey.includes("placeholder")) return false;

  const now = Date.now();
  if (
    validationCache &&
    validationCache.key === apiKey &&
    validationCache.secret === apiSecret &&
    validationCache.url === livekitUrl &&
    now - validationCache.checkedAt < 60000
  ) {
    return validationCache.isValid;
  }

  try {
    const httpUrl = livekitUrl.replace("wss://", "https://").replace("ws://", "http://");
    const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    await Promise.race([
      svc.listRooms(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("validation timeout")), 2000)),
    ]);
    validationCache = { key: apiKey, secret: apiSecret, url: livekitUrl, isValid: true, checkedAt: now };
    return true;
  } catch {
    validationCache = { key: apiKey, secret: apiSecret, url: livekitUrl, isValid: false, checkedAt: now };
    return false;
  }
}

function livekitApiPlugin(): Plugin {
  return {
    name: "livekit-api-plugin",
    configureServer(server) {
      server.middlewares.use("/api/livekit-token", async (req, res) => {
        try {
          const url = new URL(req.url || "", `http://${req.headers.host || "localhost:3000"}`);
          const sessionId = url.searchParams.get("sessionId") || "default";
          const role = url.searchParams.get("role") || "student";
          const name = url.searchParams.get("name") || (role === "teacher" ? "Instructor" : "Student");
          const userId = url.searchParams.get("userId") || `usr_${Date.now()}`;

          const livekitUrl = process.env.VITE_LIVEKIT_URL || "";
          const apiKey = process.env.LIVEKIT_API_KEY || "";
          const apiSecret = process.env.LIVEKIT_API_SECRET || "";

          if (!livekitUrl || !apiKey || !apiSecret) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ configured: false, token: null, serverUrl: null }));
            return;
          }

          const isLiveKitValid = await validateLiveKitCredentials(livekitUrl, apiKey, apiSecret);
          if (!isLiveKitValid) {
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                configured: false,
                token: null,
                serverUrl: null,
                reason: "LiveKit credentials unauthorized or invalid on server",
              })
            );
            return;
          }

          const at = new AccessToken(apiKey, apiSecret, {
            identity: `user_${userId}`,
            name,
            ttl: "2h",
          });
          at.addGrant({
            roomJoin: true,
            room: `classroom-${sessionId}`,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            roomAdmin: role === "teacher",
            roomRecord: role === "teacher",
          });

          const token = await at.toJwt();
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              configured: true,
              token,
              serverUrl: livekitUrl,
              roomName: `classroom-${sessionId}`,
              isTeacher: role === "teacher",
              participantName: name,
              identity: `user_${userId}`,
            })
          );
        } catch (err: any) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ configured: false, error: err?.message, token: null, serverUrl: null }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), livekitApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable source maps for better debugging (disable in production if needed)
    sourcemap: false,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching, single consolidated ui-kit, and lean entry point
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core React runtime
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/react-router/')
            ) {
              return 'react-vendor';
            }
            // Consolidated UI kit bundle (Radix UI primitives, animations, and icons)
            if (
              id.includes('@radix-ui') ||
              id.includes('framer-motion') ||
              id.includes('lucide-react')
            ) {
              return 'ui-kit';
            }
            // Other vendor libraries
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (
              id.includes('react-hook-form') ||
              id.includes('@hookform') ||
              id.includes('/node_modules/zod/')
            ) {
              return 'forms';
            }
          }
        },
        // Optimize chunk size
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit for better chunking
    chunkSizeWarningLimit: 1000,
    // Target modern browsers for better optimization
    target: 'esnext',
    // Minify options - using esbuild (faster than terser)
    minify: 'esbuild',
  },
  // Optimize dependencies
  optimizeDeps: {
    // Only scan the app entry HTML; avoids crawling unrelated *.html files
    // if a legacy snapshot accidentally contains leaked package folders.
    entries: ['index.html'],
    include: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-router',
      '@convex-dev/auth/react',
      'framer-motion',
    ],
  },
  // Performance hints
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    // Keep HMR on, but disable full-screen error overlay
    hmr: {
      overlay: false,
    },
  },
});
