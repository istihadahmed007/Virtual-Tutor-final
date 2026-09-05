import { useAuth } from "@/hooks/use-auth";
import { getActiveSession } from "@/lib/auth-store";
import { useTeacherProfile } from "@/hooks/use-teacher-profile";
import { ShieldAlert, Clock, AlertTriangle, XCircle, ArrowRight, Loader2, GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

export function RequireApprovedTeacher({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const { profile: teacherProfile } = useTeacherProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const activeSession = getActiveSession();
  const effectiveUser = user || activeSession;
  const hasSession = isAuthenticated || Boolean(activeSession);

  // If user is already authenticated as a teacher or admin, grant access directly without blocking
  const isDirectTeacher = effectiveUser?.role === "teacher" || effectiveUser?.role === "admin";
  const isProfileVerified =
    teacherProfile &&
    teacherProfile.isVerified &&
    teacherProfile.verificationStatus === "verified";
  const isApprovedTeacher = isDirectTeacher || isProfileVerified;

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="size-6 animate-spin text-teal-600" />
      </main>
    );
  }

  if (!hasSession) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  if (effectiveUser?.accountStatus === "suspended") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Teaching Account Suspended</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your teaching access has been suspended by administration. You cannot accept bookings, host live sessions, or edit schedules.
          </p>
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white"
          >
            Go to Student Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // If verified or direct teacher/admin, render dashboard
  if (isApprovedTeacher) {
    return <>{children}</>;
  }

  // If teacher profile is still loading for a non-teacher role, wait briefly
  if (teacherProfile === undefined && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="size-6 animate-spin text-teal-600" />
      </main>
    );
  }

  const status = teacherProfile?.verificationStatus || "not_started";

    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-lg space-y-5">
          {status === "under_review" && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Application Under Review</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Your teacher credentials and identity documents have been submitted to our administration team.
                  Once verified, your Teacher Dashboard and scheduling tools will unlock automatically.
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/80 text-left text-xs text-amber-900 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Estimated Review Time: 24–48 Hours
                </p>
                <p className="text-amber-800 text-[11px]">
                  You will receive a notification as soon as an administrator verifies your application.
                </p>
              </div>
            </>
          )}

          {status === "needs_attention" && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-xs">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Corrections Requested</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  An administrator reviewed your application and requested adjustments or clearer identity documents.
                </p>
              </div>
              {teacherProfile?.rejectionReason && (
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200/80 text-left text-xs text-orange-900 space-y-1">
                  <p className="font-semibold">Administrator Notes:</p>
                  <p className="text-orange-800 italic">"{teacherProfile.rejectionReason}"</p>
                </div>
              )}
            </>
          )}

          {status === "rejected" && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
                <XCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Application Status: Not Approved</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Your application was not approved at this time. You can update your credentials and submit an appeal.
                </p>
              </div>
              {teacherProfile?.rejectionReason && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200/80 text-left text-xs text-red-900 space-y-1">
                  <p className="font-semibold">Reason:</p>
                  <p className="text-red-800 italic">"{teacherProfile.rejectionReason}"</p>
                </div>
              )}
            </>
          )}

          {status === "not_started" && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto shadow-xs">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Teacher Verification Required</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  To access the Teacher Dashboard, conduct live whiteboard classes, and receive bookings,
                  you must complete the official Teacher Application and submit your identity documents.
                </p>
              </div>
            </>
          )}

          <div className="space-y-3 pt-2">
            <Button
              onClick={() => navigate("/teacher-application")}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold h-11 text-sm shadow-sm"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              {status === "not_started" ? "Start Teacher Application" : "View Application & Documents"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="w-full border-stone-200 text-slate-700"
            >
              Continue to Student Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
}
