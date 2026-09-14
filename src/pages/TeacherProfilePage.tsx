import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getAllTeacherApplications, LEGACY_FAKE_IDS, TEACHER_STORE_EVENT } from "@/lib/teacher-store";
import { getRegisteredUsers } from "@/lib/auth-store";
import { 
  normalizeTeacherData, 
  AuthoritativeTeacher 
} from "@/lib/teacher-authoritative-data";
import { createOrGetLocalConversation } from "@/lib/messages-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { TeacherProfileHeader } from "@/components/teachers/TeacherProfileHeader";
import { AvailabilityPreview } from "@/components/teachers/AvailabilityPreview";
import { BookingSummary, BookingDetails } from "@/components/teachers/BookingSummary";
import { SEO } from "@/components/SEO";
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

  const isFakeId = id ? LEGACY_FAKE_IDS.has(id) : false;

  // Reactive store state
  const [localApps, setLocalApps] = useState(() => getAllTeacherApplications());
  const [registeredUsersList, setRegisteredUsersList] = useState(() => getRegisteredUsers());

  useEffect(() => {
    const handleUpdate = () => {
      setLocalApps(getAllTeacherApplications());
      setRegisteredUsersList(getRegisteredUsers());
    };
    window.addEventListener(TEACHER_STORE_EVENT, handleUpdate);
    window.addEventListener("vtp_auth_change", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(TEACHER_STORE_EVENT, handleUpdate);
      window.removeEventListener("vtp_auth_change", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const localTeacher = useMemo(() => {
    if (isFakeId || !id) return null;
    const lowerId = id.toLowerCase();
    return (
      localApps.find(
        (t) =>
          (t.userId === id ||
            (t as any)._id === id ||
            t.email?.toLowerCase() === lowerId) &&
          !LEGACY_FAKE_IDS.has(t.userId) &&
          !LEGACY_FAKE_IDS.has(t._id) &&
          !LEGACY_FAKE_IDS.has(t.email)
      ) || null
    );
  }, [id, isFakeId, localApps]);

  const registeredTeacher = useMemo(() => {
    if (isFakeId || !id) return null;
    const lowerId = id.toLowerCase();
    return (
      registeredUsersList.find(
        (u) =>
          (u._id === id || u.email?.toLowerCase() === lowerId) &&
          u.role === "teacher" &&
          !LEGACY_FAKE_IDS.has(u._id) &&
          !LEGACY_FAKE_IDS.has(u.email)
      ) || null
    );
  }, [id, isFakeId, registeredUsersList]);

  // Authoritatively normalized teacher data
  const rawTeacher = useMemo(() => {
    if (isFakeId) return null;
    return (
      convexTeacher ||
      localTeacher ||
      (registeredTeacher
        ? {
            _id: registeredTeacher._id,
            userId: registeredTeacher._id,
            name: registeredTeacher.name,
            email: registeredTeacher.email,
            title: registeredTeacher.title || "Educator & Subject Specialist",
            bio: registeredTeacher.bio || "Dedicated educator ready to assist students with interactive lessons.",
            avatarUrl: registeredTeacher.avatarUrl || registeredTeacher.image,
            country: "Bangladesh",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka",
            hourlyRate: registeredTeacher.hourlyRate || 35,
            monthlyTuition:
              (typeof registeredTeacher.monthlyTuition === "number" && registeredTeacher.monthlyTuition > 0)
                ? registeredTeacher.monthlyTuition
                : (typeof registeredTeacher.hourlyRate === "number" && registeredTeacher.hourlyRate > 0)
                  ? (registeredTeacher.hourlyRate >= 500 ? registeredTeacher.hourlyRate : Math.round(registeredTeacher.hourlyRate * 100))
                  : 4000,
            subjects: registeredTeacher.subjects?.length ? registeredTeacher.subjects : ["General Studies"],
            classLevels: ["All Levels"],
            expertise: registeredTeacher.subjects || ["Tutoring"],
            languages: ["English", "Bangla"],
            yearsExperience: registeredTeacher.yearsExperience || 2,
            isVerified: registeredTeacher.isEmailVerified ?? false,
            isAvailable: true,
            rating: registeredTeacher.rating || 0,
            reviewCount: registeredTeacher.reviewCount || 0,
            totalStudents: 0,
            totalHours: 0,
          }
        : null)
    );
  }, [convexTeacher, localTeacher, registeredTeacher, isFakeId]);
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
      <main className="min-h-screen bg-transparent flex items-center justify-center text-white">
        <div className="flex items-center gap-2 text-white/70 text-sm font-medium p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          <span>Loading educator profile...</span>
        </div>
      </main>
    );
  }

  if (!teacher) {
    return (
      <main className="min-h-screen bg-transparent flex items-center justify-center p-6 text-white">
        <div className="p-8 rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.36)] max-w-md w-full">
          <EmptyState
            icon={Users}
            title="Educator profile not found"
            description="This teacher profile doesn't exist or is undergoing verification."
            actionLabel="Browse Verified Teachers"
            actionPath="/teachers"
          />
        </div>
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
    <main className="min-h-screen bg-transparent text-white pb-24">
      <SEO
        title={`${teacher.name} - ${teacher.title || teacher.subjects.join(", ") || "Educator"}`}
        description={
          teacher.bio
            ? teacher.bio.slice(0, 160)
            : `Book online lessons with ${teacher.name}, verified educator specializing in ${teacher.subjects.join(", ")}.`
        }
        ogType="profile"
        ogImage={teacher.avatarUrl}
        keywords={[teacher.name, ...teacher.subjects, "online tutor", "tutoring", "academics"]}
        structuredData={{
          "@type": "Person",
          name: teacher.name,
          jobTitle: teacher.title || "Educator",
          description: teacher.bio,
          image: teacher.avatarUrl,
        }}
      />
      {/* Top Navigation Bar */}
      <header className="bg-slate-950/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between text-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/teachers")}
            className="gap-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Faculty Directory</span>
          </Button>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartChat}
              disabled={isStartingChat}
              className="gap-2 border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white rounded-full text-xs font-semibold px-4 h-9 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-violet-400" />
              <span>{isStartingChat ? "Connecting..." : "Message"}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                const el = document.getElementById("availability");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white gap-2 rounded-full text-xs font-bold px-4 h-9 shadow-[0_4px_16px_rgba(109,93,251,0.35)] transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Reserve Session</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Authoritative Profile Header Component */}
        <div className="mb-8">
          <TeacherProfileHeader teacher={teacher} />
        </div>

        {/* Two-Column Grid: Left (Bio, Video, Education, Reviews), Right (Availability & Booking) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* About / Bio Card */}
            <Card className="border-white/12 bg-white/[0.04] backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] text-white">
              <CardHeader className="pb-4 border-b border-white/10">
                <CardTitle className="text-base text-white font-bold flex items-center gap-2 font-display">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                  <span>Academic Approach & Pedagogy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 text-sm text-white/75 leading-relaxed">
                <p>{teacher.bio}</p>

                {/* Subject Fit & Expertise Tags */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
                    Disciplines & Coursework
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {teacher.subjects.map((sub) => (
                      <span
                        key={sub}
                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/15 shadow-sm"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Class Levels & Target Curriculums */}
                {teacher.classLevels && teacher.classLevels.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
                      Target Academic Levels
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {teacher.classLevels.map((lvl) => (
                        <span
                          key={lvl}
                          className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/5 text-white/70 border border-white/10"
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
              <Card className="border-white/12 bg-white/[0.04] backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] text-white">
                <CardHeader className="pb-4 border-b border-white/10">
                  <CardTitle className="text-base flex items-center gap-2 text-white font-bold font-display">
                    <Video className="w-4 h-4 text-violet-400" />
                    <span>Introductory Video Lecture</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 aspect-video">
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
            <Card className="border-white/12 bg-white/[0.04] backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] text-white">
              <CardHeader className="pb-4 border-b border-white/10">
                <CardTitle className="text-base text-white font-bold flex items-center gap-2 font-display">
                  <GraduationCap className="w-4 h-4 text-violet-400" />
                  <span>Verified Credentials & Honors</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {teacher.education && teacher.education.length > 0 ? (
                  <div className="space-y-3">
                    {teacher.education.map((edu, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs"
                      >
                        <div className="h-9 w-9 rounded-xl bg-violet-600/30 border border-violet-400/30 text-violet-300 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm font-display">{edu.degree}</p>
                          <p className="text-white/70 font-medium">{edu.institution}</p>
                          <p className="text-white/40 mt-0.5">
                            {edu.department ? `${edu.department} · ` : ""}
                            {edu.passingYear ? `Class of ${edu.passingYear}` : ""}
                          </p>
                          {edu.result && (
                            <p className="text-teal-400 font-semibold mt-1">Honors: {edu.result}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40 italic">Academic degrees verified by administration.</p>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card className="border-white/12 bg-white/[0.04] backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] text-white">
              <CardHeader className="pb-4 border-b border-white/10">
                <CardTitle className="text-base text-white font-bold flex items-center justify-between font-display">
                  <span>Student Evaluations ({teacher.reviewCount})</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{teacher.rating.toFixed(2)} / 5.0</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Leave a review if eligible */}
                {reviewEligibility?.canReview ? (
                  <form
                    onSubmit={handleSubmitReview}
                    className="p-5 bg-white/[0.03] border border-white/10 rounded-3xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white font-display">Submit Course Evaluation</h4>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRatingInput(star)}
                            className="p-1 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= ratingInput
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-white/20"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Detail your learning outcome and instructor effectiveness..."
                      rows={3}
                      className="w-full p-3.5 bg-white/5 border border-white/12 rounded-2xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-violet-400"
                      required
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSubmittingReview}
                        size="sm"
                        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white gap-2 rounded-full font-semibold text-xs px-5 h-9 shadow-[0_4px_16px_rgba(109,93,251,0.35)] cursor-pointer"
                      >
                        {isSubmittingReview ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Post Evaluation</span>
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
                        className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white font-display">
                            {review.studentName}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: review.rating }).map((_, j) => (
                              <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                          {review.comment}
                        </p>
                        <p className="text-[10px] text-white/40">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-white/40 text-xs">
                      No student reviews yet. Reviews will appear here once verified lessons are completed.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Availability & Timezone Converter Box */}
          <div className="space-y-6">
            <div id="availability" className="sticky top-24">
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
