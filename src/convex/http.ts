import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// ─── Instant Payment Notification (IPN) Webhook ──────────────────────────────
http.route({
  path: "/payment/ipn",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const bodyText = await request.text();
      let params = new URLSearchParams(bodyText);

      // Also support JSON bodies if gateway sends JSON
      let tranId = params.get("tran_id");
      let valId = params.get("val_id");
      let status = params.get("status");
      let amountStr = params.get("amount");
      let bankTranId = params.get("bank_tran_id");
      let cardType = params.get("card_type") || params.get("card_brand");

      if (!tranId && bodyText.startsWith("{")) {
        try {
          const json = JSON.parse(bodyText);
          tranId = json.tran_id || json.metadata?.transactionId || json.invoice_id;
          valId = json.val_id || json.invoice_id;
          status = json.status;
          amountStr = json.amount;
          bankTranId = json.bank_tran_id || json.transaction_id;
          cardType = json.card_type || json.payment_method;
        } catch (_) {}
      }

      if (!tranId) {
        return new Response("Missing tran_id", { status: 400 });
      }

      const amount = amountStr ? parseFloat(amountStr) : undefined;
      const normalizedStatus = (status || "").toUpperCase();

      if (normalizedStatus === "VALID" || normalizedStatus === "VALIDATED" || normalizedStatus === "SUCCESS" || normalizedStatus === "COMPLETED") {
        await ctx.runMutation(api.payments.verifyAndFinalizePayment, {
          transactionId: tranId,
          valId: valId || undefined,
          bankTranId: bankTranId || undefined,
          cardType: cardType || "UddoktaPay",
          gatewayStatus: "VALID",
          amount,
          currency: "BDT",
        });
      } else {
        await ctx.runMutation(api.payments.recordPaymentFailure, {
          transactionId: tranId,
          reason: `IPN status: ${status}`,
          isCancelled: normalizedStatus === "CANCELLED",
        });
      }

      return new Response(JSON.stringify({ received: true, tran_id: tranId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("[Payment IPN Error]", err);
      return new Response(`IPN Error: ${err?.message}`, { status: 500 });
    }
  }),
});

// ─── UddoktaPay Dedicated Webhook ─────────────────────────────────────────────
http.route({
  path: "/uddoktapay/ipn",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const incomingApiKey =
        request.headers.get("RT-UDDOKTAPAY-API-KEY") ||
        request.headers.get("rt-uddoktapay-api-key");
      const expectedApiKey = process.env.UDDOKTAPAY_API_KEY;

      if (expectedApiKey && incomingApiKey && incomingApiKey !== expectedApiKey) {
        console.warn("[UddoktaPay Convex IPN] Rejected unauthorized webhook - API key mismatch");
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const bodyText = await request.text();
      let json: any = {};
      try {
        json = JSON.parse(bodyText);
      } catch {
        const params = new URLSearchParams(bodyText);
        json = Object.fromEntries(params.entries());
      }

      const invoiceId = json.invoice_id;
      const metadata = typeof json.metadata === "string" ? JSON.parse(json.metadata || "{}") : (json.metadata || {});
      const tranId = metadata.transactionId || json.tran_id || json.transactionId || invoiceId;
      const bookingId = metadata.bookingId || json.bookingId;
      const status = (json.status || "").toUpperCase();
      const amountStr = json.amount;
      const paymentMethod = json.payment_method || "UddoktaPay";

      if (!tranId && !bookingId) {
        return new Response(JSON.stringify({ error: "Missing invoice_id, transactionId, or bookingId" }), { status: 400 });
      }

      if (status === "COMPLETED" || status === "SUCCESS" || status === "VALID") {
        await ctx.runMutation(api.payments.verifyAndFinalizePayment, {
          transactionId: String(tranId || invoiceId),
          bookingId: bookingId ? String(bookingId) : undefined,
          valId: invoiceId ? String(invoiceId) : undefined,
          bankTranId: json.transaction_id || `UDD-${Date.now().toString(36).toUpperCase()}`,
          cardType: `UddoktaPay (${paymentMethod})`,
          gatewayStatus: "VALID",
          amount: amountStr ? parseFloat(amountStr) : undefined,
          currency: "BDT",
        });

        if (bookingId) {
          try {
            await ctx.runMutation(api.bookings.confirmBookingFromPayment, {
              bookingId: String(bookingId),
              transactionId: String(tranId || invoiceId),
              paymentMethod: `UddoktaPay (${paymentMethod})`,
              amount: amountStr ? parseFloat(amountStr) : undefined,
            });
          } catch (_) {}
        }
      } else {
        await ctx.runMutation(api.payments.recordPaymentFailure, {
          transactionId: String(tranId || invoiceId),
          reason: `UddoktaPay IPN status: ${status}`,
          isCancelled: status === "CANCELLED",
        });
      }

      return new Response(JSON.stringify({ success: true, invoice_id: invoiceId, status: "PROCESSED" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("[UddoktaPay IPN Error]", err);
      return new Response(`UddoktaPay IPN Error: ${err?.message}`, { status: 500 });
    }
  }),
});

export default http;

