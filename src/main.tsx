import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RequireApprovedTeacher } from "@/components/RequireApprovedTeacher";
import { Navigation } from "@/components/Navigation";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { errorTracker } from "@/lib/error-tracker";
import { HelmetProvider } from "react-helmet-async";
import { AppHelmet } from "@/components/AppHelmet";
import "./index.css";

// Core views loaded synchronously to prevent dynamic import fetch issues
import Landing from "./pages/Landing";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

// Vite official preload error listener for dynamic chunk resolution
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    console.warn("[Vite] Preload error detected, reloading page...", event);
    const lastReload = sessionStorage.getItem("vite_preload_reload");
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem("vite_preload_reload", now.toString());
      window.location.reload();
    }
  });
}

/**
 * Resilient lazy loader that retries dynamic chunk imports and safely refreshes
 * if a stale module graph or network glitch occurred.
 */
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  name?: string,
) {
  return lazy(async () => {
    const storageKey = `chunk_retry_${name || "module"}`;
    try {
      return await factory();
    } catch (error: unknown) {
      console.warn(`[LazyLoader] Dynamic import failed for ${name || "module"}, retrying:`, error);
      // Brief pause and retry
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return await factory();
      } catch (retryError) {
        const errMsg = retryError instanceof Error ? retryError.message : String(retryError);
        const isDynamicImportError =
          errMsg.includes("Failed to fetch dynamically imported module") ||
          errMsg.includes("dynamically imported module") ||
          errMsg.includes("Loading chunk");

        if (isDynamicImportError && typeof window !== "undefined") {
          const hasReloaded = sessionStorage.getItem(storageKey);
          if (!hasReloaded) {
            sessionStorage.setItem(storageKey, "true");
            window.location.reload();
            return new Promise(() => {});
          }
        }
        throw retryError;
      }
    }
  });
}

// Lazy load remaining secondary route components with automatic retry
const TeachersPage = lazyWithRetry(() => import("./pages/TeachersPage"), "TeachersPage");
const StudentsPage = lazyWithRetry(() => import("./pages/StudentsPage"), "StudentsPage");
const TeacherProfilePage = lazyWithRetry(() => import("./pages/TeacherProfilePage"), "TeacherProfilePage");
const ClassroomPage = lazyWithRetry(() => import("./pages/ClassroomPage"), "ClassroomPage");
const LessonsPage = lazyWithRetry(() => import("./pages/LessonsPage"), "LessonsPage");
const CalendarPage = lazyWithRetry(() => import("./pages/CalendarPage"), "CalendarPage");
const AssignmentsPage = lazyWithRetry(() => import("./pages/AssignmentsPage"), "AssignmentsPage");
const ProgressPage = lazyWithRetry(() => import("./pages/ProgressPage"), "ProgressPage");
const AiAssistantPage = lazyWithRetry(() => import("./pages/AiAssistantPage"), "AiAssistantPage");
const ProfilePage = lazyWithRetry(() => import("./pages/ProfilePage"), "ProfilePage");
const TeacherDashboard = lazyWithRetry(() => import("./pages/TeacherDashboard"), "TeacherDashboard");
const TeacherApplicationPage = lazyWithRetry(() => import("./pages/TeacherApplicationPage"), "TeacherApplicationPage");
const MessagesPage = lazyWithRetry(() => import("./pages/MessagesPage"), "MessagesPage");
const CommunityPage = lazyWithRetry(() => import("./pages/CommunityPage"), "CommunityPage");
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "NotFound");
const ResumeBuilder = lazyWithRetry(() => import("./pages/ResumeBuilder"), "ResumeBuilder");

// Admin Console Pages
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"), "AdminDashboard");
const AdminApplicationsPage = lazyWithRetry(() => import("./pages/admin/AdminApplicationsPage"), "AdminApplicationsPage");
const AdminVerificationPage = lazyWithRetry(() => import("./pages/admin/AdminVerificationPage"), "AdminVerificationPage");
const AdminUsersPage = lazyWithRetry(() => import("./pages/admin/AdminUsersPage"), "AdminUsersPage");
const AdminTeachersPage = lazyWithRetry(() => import("./pages/admin/AdminTeachersPage"), "AdminTeachersPage");
const AdminStudentsPage = lazyWithRetry(() => import("./pages/admin/AdminStudentsPage"), "AdminStudentsPage");
const AdminBookingsPage = lazyWithRetry(() => import("./pages/admin/AdminBookingsPage"), "AdminBookingsPage");
const AdminSessionsPage = lazyWithRetry(() => import("./pages/admin/AdminSessionsPage"), "AdminSessionsPage");
const AdminReviewsPage = lazyWithRetry(() => import("./pages/admin/AdminReviewsPage"), "AdminReviewsPage");
const AdminCommunityPage = lazyWithRetry(() => import("./pages/admin/AdminCommunityPage"), "AdminCommunityPage");
const AdminPaymentsPage = lazyWithRetry(() => import("./pages/admin/AdminPaymentsPage"), "AdminPaymentsPage");
const AdminReportsPage = lazyWithRetry(() => import("./pages/admin/AdminReportsPage"), "AdminReportsPage");
const AdminNotificationsPage = lazyWithRetry(() => import("./pages/admin/AdminNotificationsPage"), "AdminNotificationsPage");
const AdminAuditLogsPage = lazyWithRetry(() => import("./pages/admin/AdminAuditLogsPage"), "AdminAuditLogsPage");
const AdminSettingsPage = lazyWithRetry(() => import("./pages/admin/AdminSettingsPage"), "AdminSettingsPage");

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F4EF]">
      <div className="animate-pulse text-[#111111]/40 text-sm font-medium">Loading...</div>
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isMobileActiveChat = location.pathname === "/messages" && Boolean(searchParams.get("id"));

  return (
    <div className={`min-h-screen bg-[#F5F4EF] text-[#111111] ${isMobileActiveChat ? "pb-0" : "pb-16 md:pb-0"}`}>
      <AppHelmet />
      <Navigation />
      {children}
    </div>
  );
}

function getValidConvexUrl(): string {
  const envUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (
    envUrl &&
    !envUrl.includes("<") &&
    !envUrl.includes(">") &&
    !envUrl.includes("your-production-deployment") &&
    envUrl.startsWith("https://")
  ) {
    return envUrl;
  }
  return "https://determined-jellyfish-610.convex.cloud";
}

const CONVEX_URL = getValidConvexUrl();

const convex = new ConvexReactClient(CONVEX_URL);

import {
  authLogger,
  createLoggedConvexAuthStorage,
  getClientDiagnostics,
  probeStoragePermissions,
} from "@/lib/auth-handshake-logger";

// Diagnostics probe on app startup
const initialStorageProbe = probeStoragePermissions();
const initialClientDiag = getClientDiagnostics();
authLogger.info("Config", "Convex client initialized", {
  deployment: CONVEX_URL.replace(/^https:\/\/(.*?)\.convex\.cloud.*$/, "$1"),
  isMobile: initialClientDiag.isMobile,
  isIOS: initialClientDiag.isIOS,
  isAndroid: initialClientDiag.isAndroid,
  isSafari: initialClientDiag.isSafari,
  isStandalonePWA: initialClientDiag.isStandalonePWA,
  isInIframe: initialClientDiag.isInIframe,
  viewport: initialClientDiag.viewport,
  storage: {
    localStorage: initialStorageProbe.localStorage.available,
    sessionStorage: initialStorageProbe.sessionStorage.available,
    cookies: initialStorageProbe.cookies.available,
    indexedDB: initialStorageProbe.indexedDB.available,
    isPrivateModeLikely: initialStorageProbe.isPrivateModeLikely,
    ...(initialStorageProbe.localStorage.error
      ? { localStorageError: initialStorageProbe.localStorage.error }
      : {}),
  },
});

// Logged Convex Auth Storage adapter that traces every handshake token request, storage attempt, and permission denial
const loggedConvexAuthStorage = createLoggedConvexAuthStorage();

// Initialize Global Error Tracking & Diagnostics
errorTracker.init(convex);

const container = document.getElementById("root")!;
const existingRoot = (window as unknown as { __reactRoot?: ReturnType<typeof createRoot> }).__reactRoot;
const root = existingRoot || createRoot(container);
(window as unknown as { __reactRoot?: ReturnType<typeof createRoot> }).__reactRoot = root;

root.render(
  <StrictMode>
    <ErrorBoundary name="RootApp">
      <HelmetProvider>
        <ConvexAuthProvider
          client={convex}
          storage={loggedConvexAuthStorage}
          shouldHandleCode={false}
        >
          <BrowserRouter>
            <AppHelmet />
            <RouteErrorBoundary>
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
                  <Route path="/classroom" element={<RequireAuth><ClassroomPage /></RequireAuth>} />
                  <Route path="/classroom/:lessonId" element={<RequireAuth><ClassroomPage /></RequireAuth>} />
                  <Route path="/dashboard" element={<RequireAuth><AppShell><Dashboard /></AppShell></RequireAuth>} />
                  <Route path="/teachers" element={<RequireAuth><AppShell><TeachersPage /></AppShell></RequireAuth>} />
                  <Route path="/students" element={<RequireAuth><AppShell><StudentsPage /></AppShell></RequireAuth>} />
                  <Route path="/teachers/:id" element={<RequireAuth><AppShell><TeacherProfilePage /></AppShell></RequireAuth>} />
                  <Route path="/lessons" element={<RequireAuth><AppShell><LessonsPage /></AppShell></RequireAuth>} />
                  <Route path="/calendar" element={<RequireAuth><AppShell><CalendarPage /></AppShell></RequireAuth>} />
                  <Route path="/assignments" element={<RequireAuth><AppShell><AssignmentsPage /></AppShell></RequireAuth>} />
                  <Route path="/progress" element={<RequireAuth><AppShell><ProgressPage /></AppShell></RequireAuth>} />
                  <Route path="/ai-assistant" element={<RequireAuth><AppShell><AiAssistantPage /></AppShell></RequireAuth>} />
                  <Route path="/profile" element={<RequireAuth><AppShell><ProfilePage /></AppShell></RequireAuth>} />
                  <Route path="/teacher-application" element={<RequireAuth><AppShell><TeacherApplicationPage /></AppShell></RequireAuth>} />
                  <Route path="/teacher-dashboard" element={<RequireApprovedTeacher><AppShell><TeacherDashboard /></AppShell></RequireApprovedTeacher>} />
                  <Route path="/messages" element={<RequireAuth><AppShell><MessagesPage /></AppShell></RequireAuth>} />
                  <Route path="/community" element={<RequireAuth><AppShell><CommunityPage /></AppShell></RequireAuth>} />
                  <Route path="/resume-builder" element={<ResumeBuilder />} />

                  {/* Admin Console Dedicated Area */}
                  <Route path="/admin" element={<RequireAdmin><AdminLayout><AdminDashboard /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/applications" element={<RequireAdmin><AdminLayout><AdminApplicationsPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/verification" element={<RequireAdmin><AdminLayout><AdminVerificationPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/users" element={<RequireAdmin><AdminLayout><AdminUsersPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/teachers" element={<RequireAdmin><AdminLayout><AdminTeachersPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/students" element={<RequireAdmin><AdminLayout><AdminStudentsPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/bookings" element={<RequireAdmin><AdminLayout><AdminBookingsPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/sessions" element={<RequireAdmin><AdminLayout><AdminSessionsPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/reviews" element={<RequireAdmin><AdminLayout><AdminReviewsPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/community" element={<RequireAdmin><AdminLayout><AdminCommunityPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/payments" element={<RequireAdmin><AdminLayout><AdminPaymentsPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/reports" element={<RequireAdmin><AdminLayout><AdminReportsPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/notifications" element={<RequireAdmin><AdminLayout><AdminNotificationsPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/audit-logs" element={<RequireAdmin><AdminLayout><AdminAuditLogsPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/settings" element={<RequireAdmin><AdminLayout><AdminSettingsPage /></AdminLayout></RequireAdmin>} />
                  <Route path="/admin/teacher-applications" element={<Navigate to="/admin/applications" replace />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </RouteErrorBoundary>
          </BrowserRouter>
          <Toaster />
        </ConvexAuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
