import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Globe, 
  ShieldCheck, 
  Video, 
  ArrowRight, 
  AlertCircle,
  FileCheck,
  Sparkles
} from "lucide-react";
import { Button } from "../ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "../ui/dialog";
import { AuthoritativeTeacher, formatTk } from "@/lib/teacher-authoritative-data";

export interface BookingDetails {
  subject: string;
  sessionType: string;
  day: string;
  time: string;
  durationMinutes: number;
  price: number;
  studentNotes?: string;
}

interface BookingSummaryProps {
  teacher: AuthoritativeTeacher;
  booking: BookingDetails;
  isOpen: boolean;
  onClose: () => void;
  onConfirmed?: (bookingId: string) => void;
}

export function BookingSummary({
  teacher,
  booking,
  isOpen,
  onClose,
  onConfirmed,
}: BookingSummaryProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<string>("");

  const studentTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const handleConfirm = async () => {
    setIsSubmitting(true);

    // Simulate reliable booking creation and storage
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newSessionId = `session_${Date.now()}`;
    setCreatedSessionId(newSessionId);

    try {
      // Record simulated booking in localStorage so it renders in Dashboard & Lessons
      const existingLessonsRaw = localStorage.getItem("vtp_mock_student_lessons");
      const existingLessons = existingLessonsRaw ? JSON.parse(existingLessonsRaw) : [];

      const scheduledAt = Date.now() + 24 * 60 * 60 * 1000; // Tomorrow

      existingLessons.push({
        _id: newSessionId,
        subject: booking.subject,
        sessionType: booking.sessionType,
        scheduledAt,
        durationMinutes: booking.durationMinutes,
        teacherId: teacher.userId,
        teacherName: teacher.name,
        price: booking.price,
        status: "scheduled",
      });

      localStorage.setItem("vtp_mock_student_lessons", JSON.stringify(existingLessons));
      localStorage.setItem("vtp_has_booked_first_lesson", "true");
    } catch (_) {}

    setIsSubmitting(false);
    setIsConfirmed(true);

    if (onConfirmed) {
      onConfirmed(newSessionId);
    }
  };

  const handleCloseAll = () => {
    setIsConfirmed(false);
    onClose();
  };

  const handleGoToDashboard = () => {
    handleCloseAll();
    navigate("/dashboard");
  };

  const handleGoToClassroom = () => {
    handleCloseAll();
    navigate(`/classroom?session=${createdSessionId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-6">
        {!isConfirmed ? (
          <>
            <DialogHeader className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full w-fit mb-1 border border-teal-200/60">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Review & Confirm Session</span>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Confirm Your Lesson with {teacher.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Please verify the session details and transparent cancellation terms below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Teacher Info Card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                {teacher.avatarUrl ? (
                  <img
                    src={teacher.avatarUrl}
                    alt={teacher.name}
                    className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm">
                    {teacher.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">{teacher.name}</h4>
                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/60 px-1.5 py-0.2 rounded">
                      Verified
                    </span>
                  </div>
                  <p className="text-slate-500 line-clamp-1">{teacher.title}</p>
                  <p className="text-amber-700 font-semibold mt-0.5">
                    ★ {teacher.rating.toFixed(2)} ({teacher.reviewCount} reviews)
                  </p>
                </div>
              </div>

              {/* Session Details Grid */}
              <div className="rounded-xl border border-slate-200/80 p-3.5 space-y-2.5 bg-white">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-bold text-slate-900">{booking.subject}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Class Type:</span>
                  <span className="font-medium text-slate-800">1-on-1 Live Video</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Plan Type:</span>
                  <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded text-xs">
                    Monthly Tuition Plan
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Scheduled Weekly Slot:</span>
                  <span className="font-semibold text-slate-900">
                    {booking.day} at {booking.time}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Your Timezone:</span>
                  <span className="font-medium text-teal-700">{studentTz}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Class Duration:</span>
                  <span className="font-semibold text-slate-900">{booking.durationMinutes} minutes / class</span>
                </div>
                <div className="flex justify-between pt-1 text-sm font-bold">
                  <span className="text-slate-900">Monthly Tuition Fee:</span>
                  <span className="text-teal-700 font-black text-base">{formatTk(booking.price)} / month</span>
                </div>
              </div>

              {/* Transparent Cancellation Rule */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-50/70 border border-teal-200/60 text-teal-900">
                <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Monthly Tuition Terms:</strong> Charged monthly in Bangladeshi Taka (Tk). {teacher.cancellationPolicy || "You can pause or reschedule classes from your student dashboard anytime."}
                </p>
              </div>
            </div>

            <DialogFooter className="flex sm:justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-5"
              >
                {isSubmitting ? "Enrolling..." : "Confirm & Enroll in Monthly Plan"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 ring-4 ring-teal-50">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Lesson Successfully Scheduled!
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed mb-5">
              Your 1-on-1 session with <strong>{teacher.name}</strong> has been confirmed. You will receive an email reminder with the classroom link 15 minutes before start.
            </p>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-left mb-6 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Meeting Room:</span>
                <span className="font-mono font-bold text-teal-700">{createdSessionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">When:</span>
                <span className="font-semibold text-slate-800">{booking.day} at {booking.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-semibold text-slate-800">{booking.durationMinutes} mins</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                variant="outline"
                onClick={handleGoToDashboard}
                className="flex-1 rounded-xl text-xs font-semibold"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={handleGoToClassroom}
                className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Test Classroom Link</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
