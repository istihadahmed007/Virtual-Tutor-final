import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePaymentMutations } from "@/hooks/use-payments";
import { toast } from "sonner";
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
  Sparkles,
  Link as LinkIcon
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

// Calculate the next date matching the chosen weekday name (e.g. "Monday")
function getNextWeekdayDate(dayName: string): string {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const targetDay = daysOfWeek.findIndex((d) => d.toLowerCase() === dayName.toLowerCase());
  const now = new Date();
  const currentDay = now.getDay();
  let daysToAdd = targetDay !== -1 ? (targetDay - currentDay + 7) % 7 : 1;
  if (daysToAdd === 0) daysToAdd = 7; // Next week's slot
  const nextDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return nextDate.toISOString().split("T")[0]; // YYYY-MM-DD
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
  const [meetingCode, setMeetingCode] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>(() => getNextWeekdayDate(booking.day));

  const createBookingMut = useMutation(api.bookings.create);
  const { initiatePayment } = usePaymentMutations();

  const studentTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const handleConfirmAndPay = async () => {
    setIsSubmitting(true);
    const resolvedDate = bookingDate || getNextWeekdayDate(booking.day);

    try {
      // 1. Create the booking in pending state
      const res = await createBookingMut({
        teacherId: teacher.userId,
        date: resolvedDate,
        timeSlot: booking.time,
        durationMinutes: booking.durationMinutes,
        subject: booking.subject,
        sessionType: booking.sessionType || "1-to-1",
      });

      const newBookingId = res.bookingId as any;

      // 2. Authoritatively initiate the payment transaction record
      const paymentRes = await initiatePayment({
        bookingId: String(newBookingId),
        teacherId: teacher.userId,
        teacherName: teacher.name,
        subject: booking.subject,
        amount: booking.price,
      });

      if (!paymentRes || !paymentRes.success) {
        throw new Error("Failed to initiate tuition payment.");
      }

      toast.success("Tuition booking created. Redirecting to SSLCOMMERZ checkout...");

      // 3. Initiate SSLCOMMERZ session
      try {
        const initResponse = await fetch("/api/sslcommerz/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: paymentRes.transactionId,
            amount: paymentRes.amount,
            bookingId: newBookingId,
            studentName: paymentRes.studentName,
            teacherName: teacher.name,
            subject: booking.subject,
          }),
        });
        const initData = await initResponse.json();
        if (initData.redirectUrl) {
          navigate(initData.redirectUrl);
          return;
        }
      } catch (_) {}

      // Default redirect to interactive checkout
      navigate(`/checkout/${paymentRes.transactionId}`);
    } catch (err: unknown) {
      console.warn("Booking/payment error:", err);
      const errMsg = err instanceof Error ? err.message : "Booking could not be completed";

      if (errMsg.includes("already booked")) {
        toast.error("This time slot is already booked. Please choose another slot.");
      } else if (errMsg.includes("Not authenticated") || errMsg.includes("Unauthenticated")) {
        toast.error("Please sign in to book and pay for a session.");
        navigate(`/auth?returnTo=/teachers/${teacher._id}`);
      } else {
        toast.error(errMsg);
      }
    } finally {
      setIsSubmitting(false);
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
    navigate(`/classroom?sessionId=${createdSessionId}&meetingCode=${meetingCode}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white border border-slate-200">
        {!isConfirmed ? (
          <>
            <DialogHeader className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full w-fit mb-1 border border-blue-200/60">
                <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Review & Confirm Session</span>
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Book Lesson with {teacher.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Please verify session details and scheduled time below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Teacher Info Card */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                {teacher.avatarUrl ? (
                  <img
                    src={teacher.avatarUrl}
                    alt={teacher.name}
                    className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">
                    {teacher.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">{teacher.name}</h4>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>
                  <p className="text-slate-500 line-clamp-1">{teacher.title}</p>
                  <p className="text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
                    ★ {teacher.rating ? teacher.rating.toFixed(1) : "5.0"} ({teacher.reviewCount || 0} reviews)
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
                <span className="text-slate-600 font-medium">Session Status:</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                  Pending Confirmation
                </span>
              </div>

              {/* Session Details Grid */}
              <div className="rounded-2xl border border-slate-200/80 p-4 space-y-2.5 bg-white">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-bold text-slate-900">{booking.subject}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Session Type:</span>
                  <span className="font-medium text-slate-800">1-on-1 Live Video</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Scheduled Date:</span>
                  <span className="font-semibold text-slate-900">
                    {booking.day} ({bookingDate})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Scheduled Time:</span>
                  <span className="font-semibold text-blue-600">
                    {booking.time}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Timezone:</span>
                  <span className="font-medium text-slate-700">{studentTz}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-semibold text-slate-900">{booking.durationMinutes} minutes</span>
                </div>
                <div className="flex justify-between pt-1 text-sm font-bold">
                  <span className="text-slate-900">Rate:</span>
                  <span className="text-blue-600 font-black text-base">{formatTk(booking.price)} / mo</span>
                </div>
              </div>

              {/* Security & Cancellation Policy */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Conflict Prevention:</strong> This slot is reserved immediately upon confirmation. You can reschedule anytime from your student dashboard up to 12 hours prior to class.
                </p>
              </div>
            </div>

            <DialogFooter className="flex sm:justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAndPay}
                disabled={isSubmitting}
                className="rounded-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-6 shadow-xs gap-1.5"
              >
                {isSubmitting ? "Initiating Checkout..." : "Pay Tuition & Confirm"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 inline-block mb-2">
              Status: Confirmed
            </span>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Classroom Booking Confirmed!
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed mb-5">
              Your 1-on-1 session with <strong>{teacher.name}</strong> has been secured. You and your tutor can join the live classroom at the scheduled time.
            </p>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-left mb-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Meeting Code:</span>
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {meetingCode || createdSessionId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Date:</span>
                <span className="font-semibold text-slate-800">{booking.day} ({bookingDate})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Time:</span>
                <span className="font-semibold text-slate-800">{booking.time} ({studentTz})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-semibold text-slate-800">{booking.durationMinutes} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Badge:</span>
                <span className="text-emerald-700 font-bold">Upcoming</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                variant="outline"
                onClick={handleGoToDashboard}
                className="flex-1 rounded-full text-xs font-semibold"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={handleGoToClassroom}
                className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Join Live Classroom</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
