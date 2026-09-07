import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getAllTeacherApplications } from "@/lib/teacher-store";
import { 
  normalizeTeacherData, 
  AuthoritativeTeacher, 
  AUTHORITATIVE_SEED_TEACHERS 
} from "@/lib/teacher-authoritative-data";
import { createOrGetLocalConversation } from "@/lib/messages-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { TeacherProfileHeader } from "@/components/teachers/TeacherProfileHeader";
import { AvailabilityPreview } from "@/components/teachers/AvailabilityPreview";
import { BookingSummary, BookingDetails } from "@/components/teachers/BookingSummary";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  ArrowLeft,
  Star,
  Users,
  BookOpen,
  Video,
  MessageCircle,
  Calendar,
  Loader2,
  Send,
  GraduationCap,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";

export default function TeacherProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isConvexAuth } = useAuth();

  const convexTeacher = useQuery(api.teachers.get, { teacherId: id || "" });
  const reviews = useQuery(api.reviews.listByTeacher, { teacherId: id || "" });
  const reviewEligibility = useQuery(
    api.reviews.canReview,
    id ? { teacherId: id } : "skip",
  );

  const localTeacher = getAllTeacherApplications().find(
    (t) => t.userId === id || (t as any)._id === id
  );

  const seedTeacher = AUTHORITATIVE_SEED_TEACHERS.find(
    (t) => t.userId === id || t._id === id
  );

  // Authoritatively normalized teacher data
  const rawTeacher = convexTeacher || localTeacher || seedTeacher;
  const teacher: AuthoritativeTeacher | null = useMemo(() => {
    if (!rawTeacher) return null;
    return normalizeTeacherData(rawTeacher);
  }, [rawTeacher]);

  const createReviewMut = useMutation(api.reviews.create);
  const createConversationMut = useMutation(api.messages.createConversation);

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeBookingDetails, setActiveBookingDetails] = useState<BookingDetails | null>(null);

  // Review Form State
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Messaging State
  const [isStartingChat, setIsStartingChat] = useState(false);

  const isLoading = rawTeacher === undefined;
  const reviewList = reviews ?? [];

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
          <span>Loading educator profile...</span>
        </div>
      </main>
    );
  }

  if (!teacher) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
        <EmptyState
          icon={Users}
          title="Educator profile not found"
          description="This teacher profile doesn't exist or is undergoing verification."
          actionLabel="Browse Verified Teachers"
          actionPath="/teachers"
        />
      </main>
    );
  }

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      navigate(`/auth?returnTo=/teachers/${id}`);
      return;
    }
    if (user?._id === teacher.userId) {
      toast.info("This is your own profile.");
      return;
    }
    try {
      setIsStartingChat(true);
      if (isConvexAuth) {
        try {
          await createConversationMut({
            participantId: teacher.userId,
          });
        } catch (convErr) {
          console.debug("Remote conversation creation skipped/fallback:", convErr);
        }
      }
      createOrGetLocalConversation(
        { _id: user?._id, name: user?.name, role: user?.role },
        { userId: teacher.userId, name: teacher.name, role: "teacher", avatarUrl: teacher.avatarUrl }
      );
      navigate("/messages");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not open conversation.");
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleSlotSelected = (slot: {
    day: string;
    time: string;
    durationMinutes: number;
    price: number;
  }) => {
    if (!isAuthenticated) {
      navigate(`/auth?returnTo=/teachers/${id}`);
      return;
    }
    setActiveBookingDetails({
      subject: teacher.subjects[0] || "General Tutoring",
      sessionType: "1-on-1 Private Lesson",
      day: slot.day,
      time: slot.time,
      durationMinutes: slot.durationMinutes,
      price: slot.price,
    });
    setIsBookingModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) {
      toast.error("Please enter your review comments.");
      return;
    }

    try {
      setIsSubmittingReview(true);
      await createReviewMut({
        teacherId: teacher.userId,
        rating: ratingInput,
        comment: commentInput.trim(),
        subject: teacher.subjects[0],
      });
      toast.success("Thank you! Your verified review has been submitted.");
      setCommentInput("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-16">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/teachers")}
            className="gap-1.5 text-slate-600 hover:text-slate-900 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Teachers</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartChat}
              disabled={isStartingChat}
              className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
            >
              <MessageCircle className="w-3.5 h-3.5 text-teal-600" />
              <span>{isStartingChat ? "Connecting..." : "Message"}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                const el = document.getElementById("availability");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 rounded-xl text-xs font-bold shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>View Availability</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Authoritative Profile Header Component */}
        <div className="mb-6">
          <TeacherProfileHeader teacher={teacher} />
        </div>

        {/* Two-Column Grid: Left (Bio, Video, Education, Reviews), Right (Availability & Booking) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* About / Bio Card */}
            <Card className="border-slate-200/80 rounded-2xl shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900 font-bold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                  <span>About & Teaching Approach</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700 leading-relaxed">
                <p>{teacher.bio}</p>

                {/* Subject Fit & Expertise Tags */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Subjects & Specialties
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {teacher.subjects.map((sub) => (
                      <span
                        key={sub}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/60"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Class Levels & Target Curriculums */}
                {teacher.classLevels && teacher.classLevels.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Levels & Curriculum Coverage
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {teacher.classLevels.map((lvl) => (
                        <span
                          key={lvl}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200/60"
                        >
                          {lvl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Intro Video Card if present */}
            {teacher.introVideoUrl && (
              <Card className="border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-900 font-bold">
                    <Video className="w-4 h-4 text-teal-600" />
                    <span>Teacher Introduction Video</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <video
                      src={teacher.introVideoUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Verified Education & Credentials */}
            <Card className="border-slate-200/80 rounded-2xl shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900 font-bold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-teal-600" />
                  <span>Verified Academic Credentials</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teacher.education && teacher.education.length > 0 ? (
                  <div className="space-y-4">
                    {teacher.education.map((edu, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 text-xs"
                      >
                        <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{edu.degree}</p>
                          <p className="text-slate-600 font-medium">{edu.institution}</p>
                          <p className="text-slate-400 mt-0.5">
                            {edu.department ? `${edu.department} · ` : ""}
                            {edu.passingYear ? `Class of ${edu.passingYear}` : ""}
                          </p>
                          {edu.result && (
                            <p className="text-teal-700 font-semibold mt-1">Honors: {edu.result}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Academic degrees verified by administration.</p>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card className="border-slate-200/80 rounded-2xl shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900 font-bold flex items-center justify-between">
                  <span>Student Reviews & Feedback ({teacher.reviewCount})</span>
                  <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{teacher.rating.toFixed(2)} / 5.0</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Leave a review if eligible */}
                {reviewEligibility?.canReview ? (
                  <form
                    onSubmit={handleSubmitReview}
                    className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-teal-950">Leave a Review</h4>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRatingInput(star)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= ratingInput
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-stone-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Share your experience learning with this teacher..."
                      rows={3}
                      className="w-full p-3 bg-white border border-teal-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
                      required
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSubmittingReview}
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 rounded-xl font-semibold text-xs"
                      >
                        {isSubmittingReview ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Submit Review</span>
                      </Button>
                    </div>
                  </form>
                ) : null}

                {/* Review Items */}
                <div className="space-y-3">
                  {reviewList.length > 0 ? (
                    reviewList.map((review) => (
                      <div
                        key={review._id}
                        className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            {review.studentName}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: review.rating }).map((_, j) => (
                              <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {review.comment}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      No student reviews yet. Reviews will appear here once verified lessons are completed.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Availability & Timezone Converter Box */}
          <div className="space-y-6">
            <div id="availability" className="sticky top-20">
              <AvailabilityPreview
                teacher={teacher}
                onSelectSlot={handleSlotSelected}
                onMessageTeacher={handleStartChat}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Booking Summary Confirmation Dialog */}
      {activeBookingDetails && (
        <BookingSummary
          teacher={teacher}
          booking={activeBookingDetails}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          onConfirmed={() => {
            toast.success("Class successfully booked! Check your dashboard schedule.");
          }}
        />
      )}
    </main>
  );
}
