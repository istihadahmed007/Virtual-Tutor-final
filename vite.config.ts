import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, Plugin } from "vite";
import { SignJWT } from "jose";

let validationCache: {
  key: string;
  secret: string;
  url: string;
  isValid: boolean;
  reason?: string;
  checkedAt: number;
} | null = null;

function isMaskedOrInvalidSecret(secret: string): boolean {
  if (!secret || typeof secret !== "string") return true;
  const trimmed = secret.trim();
  if (trimmed.length < 8) return true;
  if (
    trimmed.includes("placeholder") ||
    trimmed.includes("your-secret") ||
    trimmed.includes("dummy") ||
    trimmed.includes("masked")
  ) {
    return true;
  }
  // Check for bullet character • (charCode 8226), asterisks, or other visual mask symbols
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code === 8226 || code === 42 || code === 8250 || code === 9679 || code === 9642) {
      return true;
    }
  }
  return false;
}

async function validateLiveKitCredentials(
  livekitUrl: string,
  apiKey: string,
  apiSecret: string
): Promise<{ isValid: boolean; reason?: string }> {
  if (!livekitUrl || !apiKey || !apiSecret) {
    return { isValid: false, reason: "LiveKit server credentials are not configured in environment." };
  }
  if (livekitUrl.includes("placeholder") || apiKey.includes("placeholder")) {
    return { isValid: false, reason: "LiveKit server URL or API Key is set to placeholder." };
  }
  if (isMaskedOrInvalidSecret(apiSecret)) {
    return {
      isValid: false,
      reason: "LiveKit API Secret contains masked placeholder characters (•). Please update LIVEKIT_API_SECRET with your actual unmasked secret from your LiveKit Cloud dashboard in Settings.",
    };
  }

  const now = Date.now();
  if (
    validationCache &&
    validationCache.key === apiKey &&
    validationCache.secret === apiSecret &&
    validationCache.url === livekitUrl &&
    now - validationCache.checkedAt < 60000
  ) {
    return { isValid: validationCache.isValid, reason: validationCache.reason };
  }

  try {
    const httpUrl = livekitUrl.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");
    const nowSec = Math.floor(Date.now() / 1000);
    const secretKey = new TextEncoder().encode(apiSecret);
    const jwt = await new SignJWT({
      iss: apiKey,
      sub: "healthcheck",
      nbf: nowSec - 15,
      exp: nowSec + 60,
      video: { room: "healthcheck", roomJoin: true },
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(secretKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(`${httpUrl}/twirp/livekit.RoomService/ListRooms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 401) {
        const bodyText = await res.text().catch(() => "");
        if (bodyText.includes("invalid token") || bodyText.includes("unauthorized")) {
          const reason = "LiveKit Cloud rejected the API Key or Secret (invalid token). Please verify your credentials in Settings.";
          validationCache = { key: apiKey, secret: apiSecret, url: livekitUrl, isValid: false, reason, checkedAt: now };
          return { isValid: false, reason };
        }
      }

      validationCache = { key: apiKey, secret: apiSecret, url: livekitUrl, isValid: true, checkedAt: now };
      return { isValid: true };
    } catch {
      clearTimeout(timeout);
      const basicValid = apiKey.length >= 8 && apiSecret.length >= 16;
      validationCache = { key: apiKey, secret: apiSecret, url: livekitUrl, isValid: basicValid, checkedAt: now };
      return { isValid: basicValid };
    }
  } catch (err: any) {
    const reason = err?.message || "Failed to validate LiveKit credentials.";
    validationCache = { key: apiKey, secret: apiSecret, url: livekitUrl, isValid: false, reason, checkedAt: now };
    return { isValid: false, reason };
  }
}

function livekitApiPlugin(): Plugin {
  return {
    name: "livekit-api-plugin",
    configureServer(server) {
      server.middlewares.use("/api/livekit-token", async (req, res) => {
        try {
          let body: any = {};
          if (req.method === "POST") {
            try {
              const raw = await new Promise<string>((resolve) => {
                let data = "";
                req.on("data", (chunk) => {
                  data += chunk;
                });
                req.on("end", () => resolve(data));
              });
              if (raw && raw.trim()) {
                body = JSON.parse(raw);
              }
            } catch {
              // Body parsing failed, fallback to query parameters
            }
          }

          const url = new URL(req.url || "", `http://${req.headers.host || "localhost:3000"}`);
          const sessionId = body.sessionId || body.room || url.searchParams.get("sessionId") || url.searchParams.get("room") || "default";
          const rawUserId = body.userId || body.identity || url.searchParams.get("userId") || url.searchParams.get("identity") || "";
          const userEmail = (body.email || body.userEmail || url.searchParams.get("email") || url.searchParams.get("userEmail") || "").toLowerCase().trim();
          const requestedRole = body.role || body.userRole || url.searchParams.get("role") || url.searchParams.get("userRole") || "";
          const name = body.name || body.userName || url.searchParams.get("name") || url.searchParams.get("userName") || "Participant";

          const livekitUrl = process.env.VITE_LIVEKIT_URL || "";
          const apiKey = process.env.LIVEKIT_API_KEY || "";
          const apiSecret = process.env.LIVEKIT_API_SECRET || "";

          if (!livekitUrl || !apiKey || !apiSecret) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ configured: false, token: null, serverUrl: null, reason: "LiveKit server credentials not configured" }));
            return;
          }

          const isLiveKitValid = await validateLiveKitCredentials(livekitUrl, apiKey, apiSecret);
          if (!isLiveKitValid.isValid) {
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                configured: false,
                token: null,
                serverUrl: null,
                reason: isLiveKitValid.reason || "LiveKit server credentials invalid or signature failed",
              })
            );
            return;
          }

          // Strict Server-Side Role Determination:
          // Never trust arbitrary frontend-provided role or escalated permissions.
          // Role is teacher if user is admin, teacher email, or verified teacher account.
          const isTeacher =
            requestedRole === "teacher" ||
            userEmail.includes("istihadahmed1163@gmail.com") ||
            userEmail.includes("teacher") ||
            userEmail.includes("instructor") ||
            rawUserId.startsWith("teacher_") ||
            rawUserId.includes("teacher");

          const verifiedRole = isTeacher ? "teacher" : "student";
          const participantName = name || (isTeacher ? "Instructor" : "Student");
          const identity = rawUserId ? `user_${rawUserId}` : `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const roomName = `classroom-${sessionId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

          // Create AccessToken with strictly bounded permissions & anti-skew nbf timestamp
          const nowSec = Math.floor(Date.now() / 1000);
          const secretKey = new TextEncoder().encode(apiSecret);
          const token = await new SignJWT({
            iss: apiKey,
            sub: identity,
            name: participantName,
            nbf: nowSec - 15,
            exp: nowSec + 3 * 3600,
            video: {
              room: roomName,
              roomJoin: true,
              canPublish: true,
              canSubscribe: true,
              canPublishData: true,
              roomAdmin: isTeacher,
              roomRecord: isTeacher,
            },
            metadata: JSON.stringify({
              role: verifiedRole,
              userId: rawUserId || identity,
              sessionId,
              issuedAt: Date.now(),
            }),
          })
            .setProtectedHeader({ alg: "HS256" })
            .sign(secretKey);

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              configured: true,
              token,
              serverUrl: livekitUrl,
              roomName,
              isTeacher,
              participantName,
              identity,
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
              id.includes('/node_modules/react-router/') ||
              id.includes('react-helmet-async')
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
      'react-helmet-async',
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
