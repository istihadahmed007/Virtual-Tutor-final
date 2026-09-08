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
import { EmptyState } from "@/components/EmptyState";
import { TeacherCard } from "@/components/teachers/TeacherCard";
import { SEO } from "@/components/SEO";
import { 
  TeacherFilters, 
  FilterState 
} from "@/components/teachers/TeacherFilters";
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const INITIAL_FILTERS: FilterState = {
  query: "",
  subject: "All Subjects",
  curriculum: "All Curriculums",
  gradeLevel: "All Levels",
  language: "All Languages",
  priceRange: "all",
  ratingMin: 0,
  availability: "any",
  matchMyTimezone: false,
  sortBy: "best_match",
};

export default function TeachersPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isConvexAuth } = useAuth();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const createConversationMut = useMutation(api.messages.createConversation);

  // Cloud search query
  const cloudTeachers = useQuery(api.teachers.search, {
    subject: filters.subject !== "All Subjects" ? filters.subject : undefined,
    classLevel: filters.gradeLevel !== "All Levels" ? filters.gradeLevel : undefined,
    sortBy: filters.sortBy === "highest_rated" ? "rating" : undefined,
  });

  // Local authoritative applications
  const localTeacherApps = useMemo(() => {
    return getAllTeacherApplications().filter(
      (t) => t.isVerified || t.verificationStatus === "verified"
    );
  }, []);

  // Merge and normalize all teachers through the single authoritative layer
  const allAuthoritativeTeachers: AuthoritativeTeacher[] = useMemo(() => {
    const rawList = cloudTeachers && cloudTeachers.length > 0 
      ? cloudTeachers 
      : localTeacherApps.length > 0 
      ? localTeacherApps 
      : AUTHORITATIVE_SEED_TEACHERS;

    // Use normalizeTeacherData for each entry to prevent any discrepancies
    const normalized = rawList.map((t) => normalizeTeacherData(t));

    // Ensure unique by userId
    const uniqueMap = new Map<string, AuthoritativeTeacher>();
    for (const item of normalized) {
      if (!uniqueMap.has(item.userId)) {
        uniqueMap.set(item.userId, item);
      }
    }

    // Also make sure authoritative seed educators are available for discovery
    for (const seed of AUTHORITATIVE_SEED_TEACHERS) {
      if (!uniqueMap.has(seed.userId)) {
        uniqueMap.set(seed.userId, seed);
      }
    }

    return Array.from(uniqueMap.values());
  }, [cloudTeachers, localTeacherApps]);

  // Client-side filtering & multi-criteria sorting pipeline
  const filteredTeachers = useMemo(() => {
    let list = [...allAuthoritativeTeachers];

    // 1. Text Search (Name, subjects, title, bio, expertise)
    if (filters.query.trim()) {
      const q = filters.query.toLowerCase();
      list = list.filter((t) => {
        return (
          t.name.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.bio.toLowerCase().includes(q) ||
          t.subjects.some((s) => s.toLowerCase().includes(q)) ||
          t.expertise.some((e) => e.toLowerCase().includes(q))
        );
      });
    }

    // 2. Curriculum
    if (filters.curriculum !== "All Curriculums") {
      const cur = filters.curriculum.toLowerCase();
      list = list.filter((t) => {
        return (
          t.title.toLowerCase().includes(cur) ||
          t.bio.toLowerCase().includes(cur) ||
          t.classLevels.some((c) => c.toLowerCase().includes(cur)) ||
          t.expertise.some((e) => e.toLowerCase().includes(cur))
        );
      });
    }

    // 3. Academic / Grade Level
    if (filters.gradeLevel !== "All Levels") {
      const g = filters.gradeLevel.toLowerCase();
      list = list.filter((t) => {
        return (
          t.classLevels.some((level) => level.toLowerCase().includes(g.split(" ")[0])) ||
          t.title.toLowerCase().includes(g.split(" ")[0])
        );
      });
    }

    // 4. Language
    if (filters.language !== "All Languages") {
      list = list.filter((t) => {
        return t.languages.some(
          (l) => l.toLowerCase() === filters.language.toLowerCase()
        );
      });
    }

    // 5. Monthly Tuition Plan (Tk)
    if (filters.priceRange !== "all") {
      list = list.filter((t) => {
        const tuition = t.monthlyTuition || t.hourlyRate;
        if (filters.priceRange === "under_3000" || filters.priceRange === "under_35") return tuition < 3000;
        if (filters.priceRange === "3000_5000" || filters.priceRange === "35_50") return tuition >= 3000 && tuition <= 5000;
        if (filters.priceRange === "5000_8000" || filters.priceRange === "50_70") return tuition > 5000 && tuition <= 8000;
        if (filters.priceRange === "over_8000" || filters.priceRange === "over_70") return tuition > 8000;
        return true;
      });
    }

    // 6. Minimum Rating
    if (filters.ratingMin > 0) {
      list = list.filter((t) => t.rating >= filters.ratingMin);
    }

    // 7. Availability
    if (filters.availability !== "any") {
      list = list.filter((t) => {
        if (filters.availability === "today") {
          return t.isAvailable && t.nextAvailableTime.toLowerCase().includes("today");
        }
        return t.isAvailable;
      });
    }

    // 8. Sorting
    list.sort((a, b) => {
      if (filters.sortBy === "highest_rated") {
        return b.rating - a.rating || b.reviewCount - a.reviewCount;
      }
      if (filters.sortBy === "lowest_price") {
        const rateA = a.monthlyTuition || a.hourlyRate;
        const rateB = b.monthlyTuition || b.hourlyRate;
        return rateA - rateB;
      }
      if (filters.sortBy === "earliest_available") {
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
        return b.rating - a.rating;
      }
      // default: best_match
      return b.rating * Math.log10(b.reviewCount + 10) - a.rating * Math.log10(a.reviewCount + 10);
    });

    return list;
  }, [allAuthoritativeTeachers, filters]);

  const handleStartChat = async (teacher: AuthoritativeTeacher) => {
    if (!isAuthenticated) {
      navigate(`/auth?returnTo=/teachers`);
      return;
    }
    if (user?._id === teacher.userId) {
      toast.info("This is your own profile.");
      return;
    }
    try {
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
      toast.error(err instanceof Error ? err.message : "Could not open chat with teacher.");
    }
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-16">
      <SEO
        title="Find Verified Tutors & Educators"
        description="Explore verified, top-tier tutors across mathematics, sciences, languages, and test preparation with transparent monthly tuition plans in Bangladeshi Taka."
        keywords={[
          "verified tutors",
          "math tutor",
          "physics educator",
          "STEM tutoring",
          "monthly tuition plan",
          "hire tutor online",
          "Virtual Tutor Pro",
        ]}
      />
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-1.5 text-slate-600 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
              <div className="h-4 w-px bg-slate-200" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Verified Tutors</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
                    Live Booking
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explore verified educators, compare reviews, convert timezones, and reserve 1-on-1 sessions
                </p>
              </div>
            </div>

            {/* Quick schedule shortcuts */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/lessons")}
                className="text-xs border-slate-200 text-slate-700 rounded-xl gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                <span>My Lessons</span>
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/calendar")}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl gap-1.5 shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Comprehensive Filter Bar */}
        <div className="mb-6">
          <TeacherFilters
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={handleResetFilters}
            totalResultsCount={filteredTeachers.length}
          />
        </div>

        {/* Teachers Grid or Empty State */}
        {filteredTeachers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No verified educators match your filters"
            description="Try adjusting your subject keywords, price range, or language preferences to view more qualified tutors."
            actionLabel="Reset Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeachers.map((teacher) => (
              <TeacherCard
                key={teacher.userId}
                teacher={teacher}
                searchContext={{
                  subject: filters.subject !== "All Subjects" ? filters.subject : undefined,
                  curriculum: filters.curriculum !== "All Curriculums" ? filters.curriculum : undefined,
                  grade: filters.gradeLevel !== "All Levels" ? filters.gradeLevel : undefined,
                  query: filters.query || undefined,
                }}
                onMessageClick={handleStartChat}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
