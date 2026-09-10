import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getAllTeacherApplications, TEACHER_STORE_EVENT, LEGACY_FAKE_IDS } from "@/lib/teacher-store";
import { getRegisteredUsers } from "@/lib/auth-store";
import { 
  normalizeTeacherData, 
  AuthoritativeTeacher 
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
  Calendar,
  BookOpen,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { SectionLabel } from "@/components/redesign";

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

  // Authoritative cloud teachers query (reactive across all registered educators)
  const cloudTeachers = useQuery(api.teachers.list, {});

  // Local authoritative applications with reactive updates
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

  const localTeacherApps = useMemo(() => {
    return localApps.filter(
      (t) =>
        t.userAccountStatus !== "suspended" &&
        t.verificationStatus !== "rejected" &&
        t.verificationStatus !== "suspended" &&
        !LEGACY_FAKE_IDS.has(t.userId) &&
        !LEGACY_FAKE_IDS.has(t._id) &&
        !LEGACY_FAKE_IDS.has(t.email)
    );
  }, [localApps]);

  const registeredTeacherUsers = useMemo(() => {
    return registeredUsersList
      .filter(
        (u) =>
          u.role === "teacher" &&
          u.accountStatus !== "suspended" &&
          !LEGACY_FAKE_IDS.has(u._id) &&
          !LEGACY_FAKE_IDS.has(u.email)
      )
      .map((u) => ({
        _id: u._id,
        userId: u._id,
        name: u.name,
        email: u.email,
        title: u.title || "Educator & Subject Specialist",
        bio: u.bio || "Dedicated registered educator ready for live interactive lessons.",
        avatarUrl: u.avatarUrl || u.image,
        country: "Bangladesh",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka",
        hourlyRate: u.hourlyRate || 35,
        monthlyTuition: 4500,
        subjects: u.subjects && u.subjects.length > 0 ? u.subjects : ["General Studies"],
        classLevels: ["All Levels"],
        expertise: u.subjects || ["Tutoring"],
        languages: ["English", "Bangla"],
        yearsExperience: u.yearsExperience || 2,
        isVerified: u.isEmailVerified ?? false,
        verificationStatus: u.isEmailVerified ? "verified" : "under_review",
        isAvailable: true,
        rating: u.rating || 5.0,
        reviewCount: 0,
        totalStudents: 0,
        totalHours: 0,
      }));
  }, [registeredUsersList]);

  // Merge and normalize all teachers through the single authoritative layer
  const allAuthoritativeTeachers: AuthoritativeTeacher[] = useMemo(() => {
    const uniqueMap = new Map<string, AuthoritativeTeacher>();

    // 1. Cloud teachers
    if (cloudTeachers && Array.isArray(cloudTeachers)) {
      for (const t of cloudTeachers) {
        if (
          LEGACY_FAKE_IDS.has((t as any)._id) ||
          LEGACY_FAKE_IDS.has((t as any).userId) ||
          LEGACY_FAKE_IDS.has((t as any).email)
        ) {
          continue;
        }
        const normalized = normalizeTeacherData(t);
        if (normalized.userId) {
          uniqueMap.set(normalized.userId, normalized);
        }
        if (normalized._id) {
          uniqueMap.set(normalized._id, normalized);
        }
      }
    }

    // 2. Local teacher applications (includes registered educators with full details)
    for (const app of localTeacherApps) {
      const normalized = normalizeTeacherData(app);
      if (normalized.userId) {
        const existing = uniqueMap.get(normalized.userId);
        if (!existing) {
          uniqueMap.set(normalized.userId, normalized);
        } else {
          // Merge rich details if present
          uniqueMap.set(normalized.userId, {
            ...existing,
            ...normalized,
            _id: existing._id || normalized._id,
            subjects: normalized.subjects.length > 0 ? normalized.subjects : existing.subjects,
            classLevels: normalized.classLevels.length > 0 ? normalized.classLevels : existing.classLevels,
          });
        }
      }
    }

    // 3. Registered teacher accounts
    for (const r of registeredTeacherUsers) {
      const normalized = normalizeTeacherData(r);
      if (normalized.userId && !uniqueMap.has(normalized.userId)) {
        uniqueMap.set(normalized.userId, normalized);
      }
    }

    // Deduplicate by userId to ensure clean array
    const result: AuthoritativeTeacher[] = [];
    const seen = new Set<string>();
    for (const teacher of uniqueMap.values()) {
      const key = teacher.userId || teacher._id;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(teacher);
      }
    }

    return result;
  }, [cloudTeachers, localTeacherApps, registeredTeacherUsers]);

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
    <main className="min-h-screen bg-[#F5F4EF] text-[#111111] pb-24">
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
      
      {/* Header Section */}
      <div className="border-b border-[#E5E4DE] bg-white/70 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <SectionLabel number="01" text="Verified Faculty Directory" />
              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111111] tracking-tight font-display mt-2">
                Find Qualified Tutors.
              </h1>
              <p className="text-sm sm:text-base text-[#111111]/70 mt-2 max-w-2xl">
                Compare verified educators, read student reviews, inspect monthly plans, and book your 1-on-1 session.
              </p>
            </div>

            {/* Quick schedule shortcuts */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/lessons")}
                className="rounded-full border-[#E5E4DE] text-[#111111] hover:bg-[#F5F4EF] text-xs font-semibold px-4 py-2 gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#F26522]" />
                <span>My Lessons</span>
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/calendar")}
                className="rounded-full bg-[#111111] hover:bg-[#222222] text-white text-xs font-semibold px-4 py-2 gap-1.5 shadow-xs transition-all"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule Calendar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Comprehensive Filter Bar */}
        <div className="mb-8">
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
