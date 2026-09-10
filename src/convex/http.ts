import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// ─── SSLCOMMERZ IPN (Instant Payment Notification) Webhook ──────────────────
http.route({
  path: "/sslcommerz/ipn",
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
          tranId = json.tran_id;
          valId = json.val_id;
          status = json.status;
          amountStr = json.amount;
          bankTranId = json.bank_tran_id;
          cardType = json.card_type || json.card_brand;
        } catch (_) {}
      }

      if (!tranId) {
        return new Response("Missing tran_id", { status: 400 });
      }

      const amount = amountStr ? parseFloat(amountStr) : undefined;
      const normalizedStatus = (status || "").toUpperCase();

      if (normalizedStatus === "VALID" || normalizedStatus === "VALIDATED" || normalizedStatus === "SUCCESS") {
        await ctx.runMutation(api.payments.verifyAndFinalizePayment, {
          transactionId: tranId,
          valId: valId || undefined,
          bankTranId: bankTranId || undefined,
          cardType: cardType || undefined,
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
      console.error("[SSLCOMMERZ IPN Error]", err);
      return new Response(`IPN Error: ${err?.message}`, { status: 500 });
    }
  }),
});

export default http;

