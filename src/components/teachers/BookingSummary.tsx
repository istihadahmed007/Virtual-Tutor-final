import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePaymentMutations } from "@/hooks/use-payments";
import { useAuth } from "@/hooks/use-auth";
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
  Link as LinkIcon,
  ExternalLink,
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
import { saveAdminBooking } from "@/lib/admin-store";

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
  const { user, isConvexAuth } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<string>("");
  const [meetingCode, setMeetingCode] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>(() => getNextWeekdayDate(booking.day));

  const createBookingMut = useMutation(api.bookings.create);
  const { createOrder, initiatePayment } = usePaymentMutations();

  const studentTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const handleConfirmAndPay = async () => {
    if (!user) {
      toast.error("Please sign in or create an account to book and pay for a session.");
      navigate(`/auth?returnTo=/teachers/${teacher._id || teacher.userId}`);
      return;
    }

    setIsSubmitting(true);
    const resolvedDate = bookingDate || getNextWeekdayDate(booking.day);

    try {
      // 1. Create the booking in pending state with resilient identity parameters
      let newBookingId: string | null = null;
      if (isConvexAuth) {
        try {
          const res = await createBookingMut({
            teacherId: teacher.userId,
            date: resolvedDate,
            timeSlot: booking.time,
            durationMinutes: booking.durationMinutes,
            subject: booking.subject,
            sessionType: booking.sessionType || "1-to-1",
          });

          if (res && res.bookingId) {
            newBookingId = String(res.bookingId);
          }
        } catch (convexErr: any) {
          const msg = convexErr instanceof Error ? convexErr.message : String(convexErr);
          if (msg.includes("already booked")) {
            throw convexErr;
          }
          console.warn("[Booking] Convex remote booking fallback:", convexErr);
          newBookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }
      } else {
        newBookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }

      if (!newBookingId) {
        newBookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }

      // Track in local admin booking store for unified visibility
      try {
        saveAdminBooking({
          _id: String(newBookingId),
          teacherId: teacher.userId || teacher._id,
          studentId: user._id,
          studentName: user.name || "Student",
          studentEmail: user.email || "",
          teacherName: teacher.name || "Teacher",
          teacherEmail: teacher.email || "",
          subject: booking.subject || "Academic Tutoring",
          classType: booking.sessionType || "1-to-1",
          scheduledAt: new Date(resolvedDate).getTime() || Date.now() + 86400000,
          durationMinutes: booking.durationMinutes,
          hourlyRate: teacher.hourlyRate || booking.price,
          totalAmount: booking.price,
          paymentStatus: "pending",
          status: "pending",
          _creationTime: Date.now(),
        });
      } catch (err) {
        console.warn("Local admin booking record notice:", err);
      }

      // 2. Authoritatively create the order & payment record
      const orderRes = await createOrder({
        teacherId: teacher.userId || teacher._id,
        teacherName: teacher.name,
        teacherPhoto: teacher.avatarUrl || (teacher as any).profileImage,
        courseName: `${booking.subject} Academic Class (${booking.sessionType || "1-to-1"})`,
        subject: booking.subject,
        numberOfClasses: 1,
        amount: booking.price,
        studentName: user.name,
        studentEmail: user.email,
        studentPhone: user.phone,
      });

      const paymentRes = await initiatePayment({
        bookingId: String(newBookingId),
        studentId: user._id,
        studentName: user.name,
        teacherId: teacher.userId,
        teacherName: teacher.name,
        subject: booking.subject,
        amount: booking.price,
        scheduledDate: resolvedDate,
        scheduledTime: booking.time,
      } as any);

      if (!orderRes && (!paymentRes || !paymentRes.success)) {
        throw new Error("Failed to initiate tuition payment.");
      }

      toast.success("Order created. Initializing checkout...");

      let gatewayUrl: string | undefined;
      const targetOrderId = orderRes?.order_id || paymentRes.transactionId;
      // Attempt UddoktaPay charge creation
      try {
        const uddoktaRes = await fetch("/api/uddoktapay/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: targetOrderId,
            amount: booking.price,
            bookingId: String(newBookingId),
            studentName: user?.name || "Student",
            studentEmail: user?.email || "student@vartualtutor.com",
            teacherName: teacher.name,
            subject: booking.subject,
          }),
        });

        const uddoktaData = await uddoktaRes.json();
        if (uddoktaData.payment_url) {
          gatewayUrl = uddoktaData.payment_url;
        }
      } catch (e) {
        console.warn("UddoktaPay direct init notice:", e);
      }

      // Seamlessly navigate to interactive 1-page checkout
      const checkoutUrl = gatewayUrl
        ? `/checkout/${targetOrderId}?gatewayUrl=${encodeURIComponent(gatewayUrl)}`
        : `/checkout/${targetOrderId}`;
      navigate(checkoutUrl);
    } catch (err: unknown) {
      console.warn("Booking/payment error:", err);
      const errMsg = err instanceof Error ? err.message : "Booking could not be completed";

      if (errMsg.includes("already booked")) {
        toast.error("This time slot is already booked. Please choose another slot.");
      } else if (errMsg.includes("Not authenticated") || errMsg.includes("Unauthenticated")) {
        toast.error("Please sign in to book and pay for a session.");
        navigate(`/auth?returnTo=/teachers/${teacher._id || teacher.userId}`);
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
      <DialogContent className="sm:max-w-lg max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl">
        {!isConfirmed ? (
          <>
            <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-200 bg-white shrink-0 pr-12 text-left">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] bg-slate-50 px-2.5 py-0.5 rounded-full w-fit mb-1 border border-slate-200">
                <FileCheck className="w-3.5 h-3.5 text-[#6D5DFB]" />
                <span>Review & Confirm Session</span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-[#0F172A] leading-snug font-display">
                Book Lesson with {teacher.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Please verify session details and scheduled time below.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto px-6 py-4 space-y-3.5 text-xs flex-1 overscroll-contain">
              {/* Teacher Info Card */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                {teacher.avatarUrl ? (
                  <img
                    src={teacher.avatarUrl}
                    alt={teacher.name}
                    className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-xl bg-white text-[#312E81] font-bold flex items-center justify-center text-sm shrink-0 border border-slate-200">
                    {teacher.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-[#0F172A] text-sm truncate font-display">{teacher.name}</h4>
                    <span className="text-[10px] font-semibold text-teal-700 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      Verified
                    </span>
                  </div>
                  <p className="text-slate-500 truncate text-[11px]">{teacher.title}</p>
                  <p className="text-amber-500 font-semibold mt-0.5 flex items-center gap-1 text-[11px]">
                    ★ {teacher.rating ? teacher.rating.toFixed(1) : "5.0"} ({teacher.reviewCount || 0} reviews)
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-medium">Session Status:</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#312E81] text-white shadow-xs">
                  Pending Confirmation
                </span>
              </div>

              {/* Session Details Grid */}
              <div className="rounded-2xl border border-slate-200 p-3.5 space-y-2 bg-white">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-bold text-[#0F172A]">{booking.subject}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Session Type:</span>
                  <span className="font-medium text-[#0F172A]">1-on-1 Live Video</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Scheduled Date:</span>
                  <span className="font-semibold text-[#0F172A]">
                    {booking.day} ({bookingDate})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Scheduled Time:</span>
                  <span className="font-semibold text-[#6D5DFB]">
                    {booking.time}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Timezone:</span>
                  <span className="font-medium text-slate-600">{studentTz}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-semibold text-[#0F172A]">{booking.durationMinutes} minutes</span>
                </div>
                <div className="flex justify-between pt-1 text-sm font-bold">
                  <span className="text-[#0F172A]">Rate:</span>
                  <span className="text-[#0F172A] font-bold text-base font-display">{formatTk(booking.price)} / mo</span>
                </div>
              </div>

              {/* Direct Paymently Gateway Option */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#312E81] text-white flex items-center justify-center font-bold text-[10px]">
                    ৳
                  </div>
                  <div>
                    <span className="font-bold text-[#0F172A] block text-[11px]">Virtual Tutor Secure Gateway (Paymently)</span>
                    <span className="text-[10px] text-slate-500">bKash, Nagad, Rocket, Upay, Cards & QR</span>
                  </div>
                </div>
                <a
                  href="https://vartualtutor.paymently.io/paymentlink/default/BDT"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-[#6D5DFB] hover:text-[#312E81] inline-flex items-center gap-1 shrink-0"
                >
                  <span>Pay via Gateway</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Security & Cancellation Policy */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600">
                <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Conflict Prevention:</strong> This slot is reserved immediately upon confirmation. You can reschedule anytime from your student dashboard up to 12 hours prior to class.
                </p>
              </div>
            </div>

            <DialogFooter className="px-6 py-3.5 border-t border-slate-200 bg-white shrink-0 flex flex-row items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-full text-xs h-9 px-4 border-slate-200 text-[#0F172A] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAndPay}
                disabled={isSubmitting}
                className="rounded-full bg-[#312E81] hover:bg-[#6D5DFB] text-white text-xs font-bold h-9 px-5 shadow-xs gap-1.5 transition-all cursor-pointer"
              >
                {isSubmitting ? "Initiating Checkout..." : "Pay Tuition & Confirm"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="p-6 overflow-y-auto max-h-[85vh] text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50 border border-emerald-200">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block mb-2">
              Status: Confirmed
            </span>

            <h3 className="text-xl font-bold text-[#111111] mb-1 font-display">
              Classroom Booking Confirmed!
            </h3>
            <p className="text-xs text-[#111111]/70 max-w-sm mx-auto leading-relaxed mb-5">
              Your 1-on-1 session with <strong>{teacher.name}</strong> has been secured. You and your tutor can join the live classroom at the scheduled time.
            </p>

            <div className="rounded-2xl bg-[#F5F4EF] p-4 border border-[#E5E4DE] text-xs text-left mb-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#111111]/50">Meeting Code:</span>
                <span className="font-mono font-bold text-[#111111] bg-white px-2 py-0.5 rounded-md border border-[#E5E4DE]">
                  {meetingCode || createdSessionId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111111]/50">Scheduled Date:</span>
                <span className="font-semibold text-[#111111]">{booking.day} ({bookingDate})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111111]/50">Scheduled Time:</span>
                <span className="font-semibold text-[#111111]">{booking.time} ({studentTz})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111111]/50">Duration:</span>
                <span className="font-semibold text-[#111111]">{booking.durationMinutes} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111111]/50">Status Badge:</span>
                <span className="text-emerald-700 font-bold">Upcoming</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                variant="outline"
                onClick={handleGoToDashboard}
                className="flex-1 rounded-full text-xs font-semibold border-slate-200 text-[#0F172A] hover:bg-slate-50 cursor-pointer"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={handleGoToClassroom}
                className="flex-1 rounded-full bg-[#312E81] hover:bg-[#6D5DFB] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
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
