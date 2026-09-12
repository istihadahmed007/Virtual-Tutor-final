/**
 * UddoktaPay End-to-End Dummy Payment Trigger Function
 *
 * Dispatches an authoritative mock payment initiation request to `/api/uddoktapay/init`
 * to verify end-to-end gateway routing, credentials, order payload serialization,
 * and redirect URL generation.
 */

export interface MockOrderPaymentData {
  transactionId?: string;
  amount?: number;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  teacherName?: string;
  teacherId?: string;
  subject?: string;
  origin?: string;
}

export interface DummyPaymentTriggerResult {
  success: boolean;
  statusCode: number;
  paymentUrl?: string;
  invoiceId?: string;
  transactionId: string;
  mockData: MockOrderPaymentData;
  rawResponse: any;
  error?: string;
  executedAt: string;
}

/**
 * Triggers a dummy payment initiation against the UddoktaPay endpoint with mock order data.
 * Verifies gateway connectivity, routing, and invoice creation end-to-end.
 */
export async function triggerDummyUddoktaPayment(
  customData?: Partial<MockOrderPaymentData>
): Promise<DummyPaymentTriggerResult> {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const transactionId =
    customData?.transactionId || `VT-TEST-${timestamp}-${randomSuffix}`;

  // Determine origin safely across browser and SSR/test environments
  let resolvedOrigin = customData?.origin;
  if (!resolvedOrigin && typeof window !== "undefined" && window.location?.origin) {
    resolvedOrigin = window.location.origin;
  }
  if (!resolvedOrigin) {
    resolvedOrigin = "http://localhost:3000";
  }

  const mockData: MockOrderPaymentData = {
    transactionId,
    amount: customData?.amount ?? 1200,
    studentName: customData?.studentName || "Mock Student Tester",
    studentEmail:
      customData?.studentEmail || `tester.${randomSuffix}@vartualtutor.com`,
    studentPhone: customData?.studentPhone || "01712345678",
    teacherName: customData?.teacherName || "Sarah Rahman",
    teacherId: customData?.teacherId || "tch_mock_001",
    subject: customData?.subject || "HSC Higher Mathematics Masterclass",
    origin: resolvedOrigin,
  };

  const executedAt = new Date().toISOString();

  try {
    const endpointUrl = `${resolvedOrigin}/api/uddoktapay/init`;
    console.info(`[UddoktaPay Test] Triggering dummy payment to: ${endpointUrl}`, mockData);

    const res = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mockData),
    });

    const statusCode = res.status;
    let rawResponse: any = null;

    try {
      rawResponse = await res.json();
    } catch {
      rawResponse = { text: await res.text().catch(() => "") };
    }

    if (!res.ok) {
      console.error("[UddoktaPay Test] Initiation returned HTTP error:", statusCode, rawResponse);
      return {
        success: false,
        statusCode,
        transactionId,
        mockData,
        rawResponse,
        error:
          rawResponse?.error ||
          `Gateway initiation endpoint failed with HTTP status ${statusCode}`,
        executedAt,
      };
    }

    const paymentUrl = rawResponse?.payment_url || rawResponse?.redirectUrl;
    const invoiceId = rawResponse?.invoice_id;

    if (!paymentUrl) {
      console.warn("[UddoktaPay Test] Missing payment_url in payload:", rawResponse);
      return {
        success: false,
        statusCode,
        transactionId,
        mockData,
        rawResponse,
        error: rawResponse?.error || "UddoktaPay response did not include a valid payment_url",
        executedAt,
      };
    }

    console.info("[UddoktaPay Test] Successfully triggered dummy payment:", {
      transactionId,
      invoiceId,
      paymentUrl,
    });

    return {
      success: true,
      statusCode,
      paymentUrl,
      invoiceId,
      transactionId,
      mockData,
      rawResponse,
      executedAt,
    };
  } catch (err: any) {
    console.error("[UddoktaPay Test] Exception during dummy payment trigger:", err);
    return {
      success: false,
      statusCode: 0,
      transactionId,
      mockData,
      rawResponse: null,
      error: err?.message || "Failed to reach UddoktaPay initiation endpoint",
      executedAt,
    };
  }
}

/**
 * Optional helper to verify a generated invoice ID against UddoktaPay
 */
export async function verifyDummyUddoktaPayment(
  invoiceId: string,
  origin?: string
) {
  const resolvedOrigin =
    origin ||
    (typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost:3000");

  const res = await fetch(`${resolvedOrigin}/api/uddoktapay/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice_id: invoiceId }),
  });

  return await res.json();
}

// Register globally on window in browser runtime for developer console inspection
if (typeof window !== "undefined") {
  (window as any).triggerDummyUddoktaPayment = triggerDummyUddoktaPayment;
  (window as any).verifyDummyUddoktaPayment = verifyDummyUddoktaPayment;
}
