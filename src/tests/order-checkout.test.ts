import { describe, it, expect, beforeEach } from "vitest";

// Ensure localStorage polyfill exists for node test environment
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    length: 0,
  } as Storage;
}

import {
  createOrderRecordLocal,
  getStoredOrders,
  verifyOrderServerSideLocal,
  adminVerifyOrderLocal,
  adminRefundOrderLocal,
} from "@/lib/payment-store";

describe("Order & Bangladesh 1-Page Checkout Flow", () => {
  beforeEach(() => {
    // Clear storage before each test
    localStorage.clear();
  });

  it("creates a new order record in PENDING state", () => {
    const order = createOrderRecordLocal({
      teacherId: "tch_101",
      teacherName: "Prof. Sarah Rahman",
      courseName: "HSC Physics Live Batch",
      subject: "Physics",
      numberOfClasses: 12,
      amount: 1500,
      paymentGateway: "bkash",
      studentName: "Rahim Uddin",
      studentEmail: "rahim@example.com",
      studentPhone: "01712345678",
    });

    expect(order.order_id).toBeDefined();
    expect(order.order_id.startsWith("VT-ORD-")).toBe(true);
    expect(order.payment_status).toBe("PENDING");
    expect(order.enrollment_status).toBe("PENDING");
    expect(order.amount).toBe(1500);

    const stored = getStoredOrders();
    expect(stored).toHaveLength(1);
    expect(stored[0].order_id).toBe(order.order_id);
  });

  it("authoritatively verifies order payment and activates enrollment without manual TrxID entry", () => {
    const order = createOrderRecordLocal({
      teacherId: "tch_102",
      teacherName: "Prof. Tanvir Ahmed",
      courseName: "SSC General Math",
      subject: "Mathematics",
      numberOfClasses: 8,
      amount: 1200,
      paymentGateway: "nagad",
      studentName: "Fatima Begum",
      studentEmail: "fatima@example.com",
    });

    // Automated gateway verification
    const verification = verifyOrderServerSideLocal(order.order_id, {
      status: "COMPLETED",
      paidAmount: 1200,
      paymentMethod: "NAGAD",
      gatewayTransactionId: "NGD-TXN-98231",
    });

    expect(verification.success).toBe(true);
    expect(verification.order.payment_status).toBe("PAID");
    expect(verification.order.enrollment_status).toBe("ACTIVE");
    expect(verification.order.paid_at).toBeDefined();
    expect(verification.order.lesson_id).toBeDefined();
  });

  it("allows administrator to manually verify a pending order", () => {
    const order = createOrderRecordLocal({
      teacherId: "tch_103",
      teacherName: "Dr. Farzana Kabir",
      courseName: "English Language Mastery",
      subject: "English",
      numberOfClasses: 10,
      amount: 2000,
      studentName: "Tanvir Hossain",
    });

    expect(order.payment_status).toBe("PENDING");

    const verified = adminVerifyOrderLocal(order.order_id, "Verified via bank statement");
    expect(verified.success).toBe(true);
    expect(verified.order.payment_status).toBe("PAID");
    expect(verified.order.enrollment_status).toBe("ACTIVE");
  });

  it("allows administrator to process refunds on an order", () => {
    const order = createOrderRecordLocal({
      teacherId: "tch_104",
      teacherName: "Prof. Sarah Rahman",
      courseName: "Chemistry Masterclass",
      subject: "Chemistry",
      numberOfClasses: 12,
      amount: 1800,
      studentName: "Saiful Islam",
    });

    // Pay first
    verifyOrderServerSideLocal(order.order_id, {
      status: "COMPLETED",
      paidAmount: 1800,
      paymentMethod: "BKASH",
    });

    // Refund
    const refunded = adminRefundOrderLocal(order.order_id, "Student requested schedule cancellation");
    expect(refunded.success).toBe(true);
    expect(refunded.order.payment_status).toBe("REFUNDED");
    expect(refunded.order.enrollment_status).toBe("CANCELLED");
  });
});
