import { describe, it, expect, beforeEach } from "vitest";

// Memory storage polyfill for Vitest Node environment
const memoryStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => memoryStore[key] || null,
  setItem: (key: string, value: string) => {
    memoryStore[key] = value;
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
  clear: () => {
    for (const k in memoryStore) {
      delete memoryStore[k];
    }
  },
};

if (typeof globalThis.localStorage === "undefined") {
  (globalThis as unknown as { localStorage: typeof mockLocalStorage }).localStorage = mockLocalStorage;
}

if (typeof globalThis.window === "undefined") {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: mockLocalStorage,
    dispatchEvent: () => true,
  };
}

import {
  saveRegisteredUsers,
  setActiveSession,
  getActiveSession,
  loginUser,
  switchUserRole,
  AuthUser,
  StoredAccount,
} from "@/lib/auth-store";

describe("Teacher Verification & Role Authorization Security", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it("blocks non-admin students from escalating themselves to teacher via switchUserRole", () => {
    const studentUser: AuthUser = {
      _id: "usr_student_test",
      name: "Student One",
      email: "student1@example.com",
      role: "student",
      isEmailVerified: true,
      accountStatus: "active",
    };

    setActiveSession(studentUser);
    expect(getActiveSession()?.role).toBe("student");

    // Attempt direct escalation to teacher role
    const switchRes = switchUserRole("teacher");
    // Should NOT have teacher role
    expect(switchRes?.role).not.toBe("teacher");
    expect(switchRes?.role).toBe("student");
    expect(getActiveSession()?.role).toBe("student");
  });

  it("allows administrators to switch roles for testing and inspection", () => {
    const adminUser: AuthUser = {
      _id: "usr_admin_test",
      name: "Platform Admin",
      email: "admin@virtualtutorpro.com",
      role: "admin",
      isEmailVerified: true,
      accountStatus: "active",
    };

    setActiveSession(adminUser);
    expect(getActiveSession()?.role).toBe("admin");

    const switchRes = switchUserRole("teacher");
    expect(switchRes?.role).toBe("teacher");
  });

  it("enforces strict password verification in loginUser", () => {
    const userAccount: StoredAccount = {
      _id: "usr_member_1",
      name: "Alex Rivera",
      email: "alex@example.com",
      passwordHash: "correctPassword123!",
      role: "student",
      isEmailVerified: true,
      accountStatus: "active",
    };

    saveRegisteredUsers([userAccount]);

    // Wrong password should fail
    const wrongLogin = loginUser("alex@example.com", "wrongPassword");
    expect(wrongLogin.success).toBe(false);
    expect(wrongLogin.error).toBeDefined();

    // Correct password should succeed
    const correctLogin = loginUser("alex@example.com", "correctPassword123!");
    expect(correctLogin.success).toBe(true);
    expect(correctLogin.user?.email).toBe("alex@example.com");
  });
});
