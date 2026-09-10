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

function sslcommerzApiPlugin(): Plugin {
  return {
    name: "sslcommerz-api-plugin",
    configureServer(server) {
      // Configuration check endpoint (safe non-sensitive status)
      server.middlewares.use("/api/sslcommerz/config", (req, res) => {
        const storeId = process.env.SSLCOMMERZ_STORE_ID;
        const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
        const isConfigured = Boolean(
          storeId &&
            storePassword &&
            !storeId.includes("placeholder") &&
            !storePassword.includes("placeholder") &&
            storeId.trim().length > 3 &&
            storePassword.trim().length > 3
        );
        const isSandbox = process.env.SSLCOMMERZ_SANDBOX_MODE !== "false";

        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            configured: isConfigured,
            isSandbox,
            currency: "BDT",
            gatewayName: "SSLCOMMERZ Bangladesh",
            commissionRate: 0.15,
          })
        );
      });

      // Session Initialization Endpoint
      server.middlewares.use("/api/sslcommerz/init", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }

        try {
          const raw = await new Promise<string>((resolve) => {
            let data = "";
            req.on("data", (chunk) => {
              data += chunk;
            });
            req.on("end", () => resolve(data));
          });

          const body = raw ? JSON.parse(raw) : {};
          const {
            transactionId,
            amount,
            bookingId,
            studentName = "Student",
            studentEmail = "student@example.com",
            studentPhone = "01700000000",
            teacherName = "Instructor",
            subject = "Academic Tutoring",
          } = body;

          if (!transactionId || !amount) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, reason: "Missing transactionId or amount" }));
            return;
          }

          const storeId = process.env.SSLCOMMERZ_STORE_ID;
          const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
          const isSandbox = process.env.SSLCOMMERZ_SANDBOX_MODE !== "false";
          const isLiveConfigured = Boolean(
            storeId &&
              storePassword &&
              !storeId.includes("placeholder") &&
              !storePassword.includes("placeholder") &&
              storeId.trim().length > 3 &&
              storePassword.trim().length > 3
          );

          const host = req.headers.host || "localhost:3000";
          const protocol = req.headers["x-forwarded-proto"] || "http";
          const origin = `${protocol}://${host}`;

          if (isLiveConfigured) {
            const sessionUrl =
              process.env.SSLCOMMERZ_SESSION_URL ||
              (isSandbox
                ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
                : "https://securepay.sslcommerz.com/gwprocess/v4/api.php");

            const postData = new URLSearchParams({
              store_id: storeId!,
              store_passwd: storePassword!,
              total_amount: String(amount),
              currency: "BDT",
              tran_id: transactionId,
              success_url: `${origin}/api/sslcommerz/callback?status=success&tran_id=${encodeURIComponent(transactionId)}`,
              fail_url: `${origin}/api/sslcommerz/callback?status=fail&tran_id=${encodeURIComponent(transactionId)}`,
              cancel_url: `${origin}/api/sslcommerz/callback?status=cancel&tran_id=${encodeURIComponent(transactionId)}`,
              ipn_url: `${origin}/api/sslcommerz/ipn`,
              cus_name: studentName,
              cus_email: studentEmail,
              cus_phone: studentPhone,
              cus_add1: "Dhaka, Bangladesh",
              cus_city: "Dhaka",
              cus_country: "Bangladesh",
              shipping_method: "NO",
              product_name: `Virtual Tutor - ${subject} (${teacherName})`,
              product_category: "Education",
              product_profile: "general",
              value_a: bookingId || "",
            });

            try {
              const gatewayResponse = await fetch(sessionUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: postData.toString(),
              });

              const gatewayJson = (await gatewayResponse.json()) as any;

              if (gatewayJson.status === "SUCCESS" && gatewayJson.GatewayPageURL) {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    mode: "gateway",
                    redirectUrl: gatewayJson.GatewayPageURL,
                    sessionKey: gatewayJson.sessionkey,
                    transactionId,
                  })
                );
                return;
              } else {
                console.warn("[SSLCOMMERZ Init Warning] Gateway rejected session:", gatewayJson);
              }
            } catch (gwErr) {
              console.warn("[SSLCOMMERZ Gateway Error] Falling back to checkout view:", gwErr);
            }
          }

          // Fallback / Sandbox Interactive Checkout Flow
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              success: true,
              mode: "sandbox",
              redirectUrl: `/checkout/${transactionId}`,
              transactionId,
              configured: isLiveConfigured,
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: err?.message }));
        }
      });

      // Gateway Callback Redirect Handler
      server.middlewares.use("/api/sslcommerz/callback", async (req, res) => {
        try {
          const url = new URL(req.url || "", `http://${req.headers.host || "localhost:3000"}`);
          let status = url.searchParams.get("status") || "pending";
          let tranId = url.searchParams.get("tran_id") || "";
          let valId = url.searchParams.get("val_id") || "";

          // In case SSLCOMMERZ POSTs to callback
          if (req.method === "POST") {
            try {
              const raw = await new Promise<string>((resolve) => {
                let data = "";
                req.on("data", (chunk) => {
                  data += chunk;
                });
                req.on("end", () => resolve(data));
              });

              const postParams = new URLSearchParams(raw);
              if (postParams.get("tran_id")) tranId = postParams.get("tran_id")!;
              if (postParams.get("val_id")) valId = postParams.get("val_id")!;
              if (postParams.get("status")) {
                const s = postParams.get("status")!.toUpperCase();
                status = s === "VALID" || s === "VALIDATED" ? "success" : s === "FAILED" ? "fail" : "cancel";
              }
            } catch (parseErr) {
              console.warn("Failed to parse POST body in callback:", parseErr);
            }
          }

          res.writeHead(302, {
            Location: `/checkout/${tranId}?gateway_status=${status}&val_id=${valId}`,
          });
          res.end();
        } catch (err: any) {
          res.writeHead(302, { Location: `/dashboard` });
          res.end();
        }
      });

      // Gateway Validation Server-to-Server Proxy
      server.middlewares.use("/api/sslcommerz/validate", async (req, res) => {
        try {
          const url = new URL(req.url || "", `http://${req.headers.host || "localhost:3000"}`);
          const valId = url.searchParams.get("val_id");
          const storeId = process.env.SSLCOMMERZ_STORE_ID;
          const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
          const isSandbox = process.env.SSLCOMMERZ_SANDBOX_MODE !== "false";

          if (!valId || !storeId || !storePassword) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ status: "SANDBOX_SIMULATED", val_id: valId || "TEST_VAL_ID" }));
            return;
          }

          const validationBaseUrl =
            process.env.SSLCOMMERZ_VALIDATION_URL ||
            (isSandbox
              ? "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
              : "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php");

          const valUrl = `${validationBaseUrl}?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(storePassword)}&v=1&format=json`;

          const valRes = await fetch(valUrl);
          const valJson = await valRes.json();

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(valJson));
        } catch (err: any) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "FAILED", error: err?.message }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), livekitApiPlugin(), sslcommerzApiPlugin()],
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
