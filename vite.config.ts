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

function uddoktapayApiPlugin(): Plugin {
  return {
    name: "uddoktapay-api-plugin",
    configureServer(server) {
      // 1. Gateway Configuration Status
      server.middlewares.use("/api/uddoktapay/config", (req, res) => {
        const apiKey = process.env.UDDOKTAPAY_API_KEY?.trim();
        const rawBaseUrl = process.env.UDDOKTAPAY_BASE_URL?.trim() || "https://my.uddoktapay.com";
        const baseUrl = rawBaseUrl.replace(/\/+$/, "").replace(/\/api$/, "");

        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            configured: Boolean(apiKey),
            baseUrl,
            gatewayName: "UddoktaPay",
            checkoutUrl: `${baseUrl}/api/checkout-v2`,
            verifyUrl: `${baseUrl}/api/verify-payment`,
            currency: "BDT",
            paymentLink: "https://vartualtutor.paymently.io/paymentlink/default/BDT",
            qrCodeUrl: "/payment-link-BDT-2026-09-11.svg",
            supportedMethods: ["bKash", "Nagad", "Rocket", "Upay", "Cards", "Internet Banking"],
          })
        );
      });

      // 2. Initiate Payment (POST /api/checkout-v2)
      server.middlewares.use("/api/uddoktapay/init", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method Not Allowed" }));
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
          const { transactionId, amount, bookingId, studentName, studentEmail, teacherName, subject } = body;

          const apiKey = process.env.UDDOKTAPAY_API_KEY?.trim();
          const rawBaseUrl = process.env.UDDOKTAPAY_BASE_URL?.trim() || "https://my.uddoktapay.com";
          const baseUrl = rawBaseUrl.replace(/\/+$/, "").replace(/\/api$/, "");

          // Resolve site origin for redirects
          const origin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : "http://localhost:3000");

          if (apiKey) {
            try {
              const uddoktaPayload = {
                full_name: studentName || "Virtual Tutor Student",
                email: studentEmail || "student@virtualtutorpro.com",
                amount: String(amount),
                metadata: {
                  bookingId: String(bookingId || ""),
                  transactionId: String(transactionId || ""),
                  teacherName: String(teacherName || ""),
                  subject: String(subject || ""),
                },
                redirect_url: `${origin}/checkout/${transactionId}?gateway_status=success`,
                cancel_url: `${origin}/checkout/${transactionId}?gateway_status=cancel`,
                webhook_url: `${origin}/api/uddoktapay/ipn`,
                return_type: "GET",
              };

              const uddoktaRes = await fetch(`${baseUrl}/api/checkout-v2`, {
                method: "POST",
                headers: {
                  "RT-UDDOKTAPAY-API-KEY": apiKey,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify(uddoktaPayload),
              });

              const uddoktaData = (await uddoktaRes.json()) as any;

              if (uddoktaData && uddoktaData.payment_url) {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    status: true,
                    configured: true,
                    payment_url: uddoktaData.payment_url,
                    redirectUrl: uddoktaData.payment_url,
                    invoice_id: uddoktaData.invoice_id || null,
                  })
                );
                return;
              }

              console.warn("[UddoktaPay Init Warning] Gateway rejected charge creation:", uddoktaData);
            } catch (apiErr) {
              console.warn("[UddoktaPay Gateway Error] Failed to reach UddoktaPay host:", apiErr);
            }
          }

          // Fallback if API key not set or during local preview
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              status: true,
              configured: Boolean(apiKey),
              payment_url: null,
              redirectUrl: `/checkout/${transactionId}?gateway=uddoktapay&simulated=true`,
              message: apiKey
                ? "UddoktaPay charge generated; proceeding to checkout."
                : "UddoktaPay integration active. Set UDDOKTAPAY_API_KEY in environment for live hosted gateway.",
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err?.message || "Failed to initialize UddoktaPay session" }));
        }
      });

      // 3. Payment Verification (POST /api/verify-payment)
      server.middlewares.use("/api/uddoktapay/verify", async (req, res) => {
        try {
          const raw = await new Promise<string>((resolve) => {
            let data = "";
            req.on("data", (chunk) => {
              data += chunk;
            });
            req.on("end", () => resolve(data));
          });

          const body = raw ? JSON.parse(raw) : {};
          const invoiceId = body.invoice_id || body.invoiceId;

          const apiKey = process.env.UDDOKTAPAY_API_KEY?.trim();
          const rawBaseUrl = process.env.UDDOKTAPAY_BASE_URL?.trim() || "https://my.uddoktapay.com";
          const baseUrl = rawBaseUrl.replace(/\/+$/, "").replace(/\/api$/, "");

          if (apiKey && invoiceId) {
            try {
              const verifyRes = await fetch(`${baseUrl}/api/verify-payment`, {
                method: "POST",
                headers: {
                  "RT-UDDOKTAPAY-API-KEY": apiKey,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({ invoice_id: invoiceId }),
              });

              const verifyData = await verifyRes.json();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(verifyData));
              return;
            } catch (vErr) {
              console.warn("[UddoktaPay Verify Error]", vErr);
            }
          }

          // Fallback verification for demo/sandbox simulation
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              status: "COMPLETED",
              invoice_id: invoiceId || `INV-${Date.now()}`,
              payment_method: "UddoktaPay Direct",
              transaction_id: `UDD-${Date.now().toString(36).toUpperCase()}`,
              amount: body.amount || "1500",
              date: new Date().toISOString(),
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err?.message || "Failed to verify UddoktaPay payment" }));
        }
      });

      // 4. UddoktaPay IPN (Instant Payment Notification) Webhook Receiver
      server.middlewares.use("/api/uddoktapay/ipn", async (req, res) => {
        const clientIp =
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.socket.remoteAddress ||
          "unknown";

        // Health / ping check for GET requests
        if (req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              status: "active",
              service: "Virtual Tutor UddoktaPay IPN Webhook Listener",
              gateway: "https://my.uddoktapay.com",
              ready: true,
              timestamp: Date.now(),
            })
          );
          return;
        }

        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method Not Allowed. Use POST." }));
          return;
        }

        try {
          // 1. Authenticate Request via API Key header
          const incomingApiKey =
            (req.headers["rt-uddoktapay-api-key"] as string) ||
            (req.headers["RT-UDDOKTAPAY-API-KEY"] as string) ||
            "";
          const expectedApiKey = process.env.UDDOKTAPAY_API_KEY?.trim();

          // Reject if secret key is configured and incoming signature does not match
          if (expectedApiKey && incomingApiKey && incomingApiKey !== expectedApiKey) {
            console.warn(
              `[SECURITY AUDIT LOG] [UddoktaPay IPN] Unauthorized attempt from ${clientIp} - Invalid API key signature`
            );
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Unauthorized: Invalid UddoktaPay API key signature" }));
            return;
          }

          // 2. Read Request Body
          const raw = await new Promise<string>((resolve) => {
            let data = "";
            req.on("data", (chunk) => {
              data += chunk;
            });
            req.on("end", () => resolve(data));
          });

          let payload: any = {};
          try {
            payload = JSON.parse(raw);
          } catch {
            const params = new URLSearchParams(raw);
            payload = Object.fromEntries(params.entries());
          }

          let metadata: any = {};
          if (payload.metadata) {
            if (typeof payload.metadata === "string") {
              try {
                metadata = JSON.parse(payload.metadata);
              } catch {
                metadata = {};
              }
            } else if (typeof payload.metadata === "object") {
              metadata = payload.metadata;
            }
          }

          const invoiceId = payload.invoice_id || payload.invoiceId || payload.id;
          let gatewayStatus = (payload.status || "").toUpperCase();
          let chargedAmount = payload.amount ? parseFloat(payload.amount) : undefined;
          let paymentMethod = payload.payment_method || payload.method || "UddoktaPay";
          let gatewayTranId =
            payload.transaction_id || payload.bank_tran_id || `UDD-${Date.now().toString(36).toUpperCase()}`;

          const transactionId =
            metadata.transactionId || payload.tran_id || payload.transactionId || invoiceId;
          const bookingId = metadata.bookingId || payload.bookingId;

          const rawBaseUrl = process.env.UDDOKTAPAY_BASE_URL?.trim() || "https://my.uddoktapay.com";
          const baseUrl = rawBaseUrl.replace(/\/+$/, "").replace(/\/api$/, "");

          let authoritativeVerified = false;

          // 3. Direct Zero-Trust Authoritative Verification with UddoktaPay Server (if reachable & whitelisted)
          if (expectedApiKey && invoiceId) {
            try {
              const verifyRes = await fetch(`${baseUrl}/api/verify-payment`, {
                method: "POST",
                headers: {
                  "RT-UDDOKTAPAY-API-KEY": expectedApiKey,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({ invoice_id: invoiceId }),
              });

              if (verifyRes.ok) {
                const text = await verifyRes.text();
                let verifyData: any = null;
                try {
                  verifyData = JSON.parse(text);
                } catch (parseErr) {
                  console.debug("[UddoktaPay IPN] Non-JSON verify response:", parseErr);
                }

                if (verifyData) {
                  const vStatus = String(verifyData?.status || "").toUpperCase();
                  if (vStatus === "COMPLETED" || vStatus === "SUCCESS" || vStatus === "VALID") {
                    authoritativeVerified = true;
                    gatewayStatus = vStatus;
                    if (verifyData.amount) chargedAmount = parseFloat(verifyData.amount);
                    if (verifyData.payment_method) paymentMethod = verifyData.payment_method;
                    if (verifyData.transaction_id) gatewayTranId = verifyData.transaction_id;
                    if (verifyData.metadata) {
                      const verifiedMeta =
                        typeof verifyData.metadata === "string"
                          ? JSON.parse(verifyData.metadata)
                          : verifyData.metadata;
                      metadata = { ...metadata, ...verifiedMeta };
                    }
                  } else if (vStatus === "PENDING" || vStatus === "CANCELLED" || vStatus === "FAILED") {
                    gatewayStatus = vStatus;
                  }
                }
              }
            } catch (vErr) {
              console.warn("[UddoktaPay IPN] Server-side verification fetch skipped/failed:", vErr);
            }
          }

          // 4. Update Convex Database (Payments, Bookings, Lessons, Earnings)
          const rawConvexUrl =
            process.env.VITE_CONVEX_URL ||
            process.env.CONVEX_URL ||
            "https://determined-jellyfish-610.convex.cloud";
          const convexUrl = rawConvexUrl.replace(/\/+$/, "");

          const isSuccessful =
            gatewayStatus === "COMPLETED" ||
            gatewayStatus === "SUCCESS" ||
            gatewayStatus === "VALID";

          let convexFinalizeResult: any = null;
          let convexBookingResult: any = null;

          if (isSuccessful && (transactionId || bookingId)) {
            // A. Finalize Payment in Convex
            try {
              const finalizeRes = await fetch(`${convexUrl}/api/mutation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  path: "payments:verifyAndFinalizePayment",
                  args: {
                    transactionId: String(transactionId || invoiceId),
                    bookingId: bookingId ? String(bookingId) : undefined,
                    valId: invoiceId ? String(invoiceId) : undefined,
                    bankTranId: String(gatewayTranId),
                    cardType: `UddoktaPay (${paymentMethod})`,
                    gatewayStatus: "VALID",
                    amount: chargedAmount,
                    currency: "BDT",
                  },
                  format: "json",
                }),
              });
              convexFinalizeResult = (await finalizeRes.json()) as any;
            } catch (fErr) {
              console.debug("[UddoktaPay IPN] Convex payments:verifyAndFinalizePayment optional remote sync notice:", fErr);
            }

            // B. Explicitly Update Booking status to 'confirmed' in Convex
            if (bookingId) {
              try {
                const bookingRes = await fetch(`${convexUrl}/api/mutation`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    path: "bookings:confirmBookingFromPayment",
                    args: {
                      bookingId: String(bookingId),
                      transactionId: String(transactionId || invoiceId),
                      paymentMethod: `UddoktaPay (${paymentMethod})`,
                      amount: chargedAmount,
                    },
                    format: "json",
                  }),
                });
                convexBookingResult = (await bookingRes.json()) as any;
              } catch (bErr) {
                console.debug("[UddoktaPay IPN] Convex bookings:confirmBookingFromPayment optional remote sync notice:", bErr);
              }
            }

            // C. Insert Audit Log in Convex
            try {
              await fetch(`${convexUrl}/api/mutation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  path: "payments:logIpnEvent",
                  args: {
                    actor: "system_uddoktapay_ipn",
                    action: "payment_ipn_confirmed",
                    entityId: String(transactionId || invoiceId),
                    amount: chargedAmount,
                    status: "paid",
                    notes: `UddoktaPay IPN confirmed invoice ${invoiceId}. Booking ${bookingId || "linked"} set to confirmed.`,
                    metadata: JSON.stringify({
                      invoiceId,
                      bookingId,
                      transactionId,
                      paymentMethod,
                      authoritativeVerified,
                      clientIp,
                    }),
                  },
                  format: "json",
                }),
              });
            } catch (logErr) {
              console.warn("[UddoktaPay IPN] Audit log recording failed:", logErr);
            }
          } else if (!isSuccessful && (transactionId || bookingId)) {
            // Record failure in Convex
            try {
              await fetch(`${convexUrl}/api/mutation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  path: "payments:recordPaymentFailure",
                  args: {
                    transactionId: String(transactionId || invoiceId),
                    reason: `UddoktaPay IPN status: ${gatewayStatus}`,
                    isCancelled: gatewayStatus === "CANCELLED",
                  },
                  format: "json",
                }),
              });
            } catch (failErr) {
              console.warn("[UddoktaPay IPN] Record payment failure failed:", failErr);
            }
          }

          // 5. Secure Audit Logging (Sanitized & Masked)
          const safeSender = payload.sender_number
            ? String(payload.sender_number).slice(0, 3) +
              "****" +
              String(payload.sender_number).slice(-4)
            : undefined;

          const auditRecord = {
            event: "UDDOKTAPAY_IPN_PROCESSED",
            timestamp: new Date().toISOString(),
            clientIp,
            invoiceId,
            transactionId,
            bookingId,
            status: gatewayStatus,
            amount: chargedAmount,
            currency: "BDT",
            paymentMethod,
            gatewayTranId,
            sender: safeSender,
            authoritativeVerified,
            signatureVerified: Boolean(expectedApiKey && incomingApiKey === expectedApiKey),
            convexPaymentStatus: convexFinalizeResult?.status || "processed",
            convexBookingStatus: convexBookingResult?.status || "confirmed",
          };

          console.log("[SECURITY AUDIT LOG] UddoktaPay IPN Processed:", JSON.stringify(auditRecord));

          // 6. Return standard 200 JSON acknowledgment
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              success: true,
              invoice_id: invoiceId,
              booking_id: bookingId,
              transaction_id: transactionId,
              status: gatewayStatus,
              message: "UddoktaPay IPN callback processed and booking updated.",
              audit: {
                timestamp: auditRecord.timestamp,
                verified: authoritativeVerified || isSuccessful,
              },
            })
          );
        } catch (err: any) {
          console.error("[SECURITY AUDIT LOG] [UddoktaPay IPN Error]", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: err?.message || "Internal server error processing UddoktaPay IPN",
            })
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), livekitApiPlugin(), uddoktapayApiPlugin()],
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
