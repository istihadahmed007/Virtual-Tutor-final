import React, { useState, useMemo, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getAllTeacherApplications, LEGACY_FAKE_IDS, TEACHER_STORE_EVENT } from "@/lib/teacher-store";
import { normalizeTeacherData, AuthoritativeTeacher } from "@/lib/teacher-authoritative-data";
import { Navigation } from "@/components/Navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { ContactModal } from "@/components/ContactModal";
import {
  SectionLabel,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
  TutorCard,
} from "@/components/redesign";
import {
  ShieldCheck,
  Video,
  Users,
  BookOpen,
  Calendar,
  CheckCircle2,
  Sparkles,
  Search,
  GraduationCap,
  Star,
  Clock,
  ArrowRight,
  PenTool,
  Lock,
  TrendingUp,
  ChevronDown,
  Monitor,
  Mic,
  MessageSquare,
  HelpCircle,
  Phone,
  Mail,
  SlidersHorizontal,
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Active query filters for tutor discovery
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [contactOpen, setContactOpen] = useState(false);

  // Authoritative cloud teachers query
  const teachersQuery = useQuery(api.teachers.list, {});

  // Local authoritative applications
  const [localApps, setLocalApps] = useState(() => getAllTeacherApplications());

  useEffect(() => {
    const handleUpdate = () => {
      setLocalApps(getAllTeacherApplications());
    };
    window.addEventListener(TEACHER_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(TEACHER_STORE_EVENT, handleUpdate);
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

  // Merge authoritative teacher sources
  const teachers: AuthoritativeTeacher[] = useMemo(() => {
    const map = new Map<string, AuthoritativeTeacher>();
    if (teachersQuery && Array.isArray(teachersQuery)) {
      for (const t of teachersQuery) {
        if (!t || LEGACY_FAKE_IDS.has(t._id) || LEGACY_FAKE_IDS.has(t.userId) || LEGACY_FAKE_IDS.has(t.email)) {
          continue;
        }
        const normalized = normalizeTeacherData(t);
        const key = normalized.userId || normalized._id;
        if (key) map.set(key, normalized);
      }
    }
    for (const app of localTeacherApps) {
      if (!app || LEGACY_FAKE_IDS.has(app._id) || LEGACY_FAKE_IDS.has(app.userId) || LEGACY_FAKE_IDS.has(app.email)) {
        continue;
      }
      const normalized = normalizeTeacherData(app);
      const key = normalized.userId || normalized._id;
      if (key && !map.has(key)) {
        map.set(key, normalized);
      }
    }
    return Array.from(map.values());
  }, [teachersQuery, localTeacherApps]);

  const subjectPills = [
    "All",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Computer Science",
    "English",
    "Higher Math",
  ];

  const levelOptions = [
    "All",
    "Secondary (Class 9-10)",
    "Higher Secondary (HSC)",
    "O-Level / A-Level",
    "University Admission",
  ];

  // Filter teachers by search query, subject, and level
  const filteredTeachers = useMemo(() => {
    return teachers
      .filter((t) => {
        const matchesSubject =
          selectedSubject === "All" ||
          t.subjects?.some((s) =>
            s.toLowerCase().includes(selectedSubject.toLowerCase())
          );
        const matchesLevel =
          selectedLevel === "All" ||
          t.classLevels?.some((l) =>
            l.toLowerCase().includes(selectedLevel.toLowerCase())
          );
        const matchesSearch =
          !searchQuery.trim() ||
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subjects?.some((s) =>
            s.toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          t.title?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSubject && matchesLevel && matchesSearch;
      })
      .slice(0, 6);
  }, [teachers, selectedSubject, selectedLevel, searchQuery]);

  // Primary featured teacher for hero display
  const featuredTeacher = teachers[0] || {
    name: "Dr. Sarah Rahman",
    title: "Senior Lecturer, Physics & Higher Math",
    avatarUrl: "",
    rating: 5.0,
    reviewCount: 24,
    subjects: ["Physics", "Higher Math"],
    isVerified: true,
  };

  // Motion variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const faqs = [
    {
      q: "How does Virtual Tutor Pro verify educators?",
      a: "Every teacher on Virtual Tutor Pro undergoes a rigorous multi-tier verification process including academic credential audits, national identity verification, and live interactive teaching evaluations before their profile is approved for public discovery.",
    },
    {
      q: "How do live lessons and the virtual classroom work?",
      a: "Classes take place directly inside our browser-based live classroom. You get HD video/audio, an interactive low-latency digital whiteboard, screen sharing, formula tools, and instant chat with zero software downloads needed.",
    },
    {
      q: "What payment methods are accepted?",
      a: "We support instant, secure automated checkout through bKash, Nagad, Rocket, Upay, and major debit/credit cards via our certified UddoktaPay and SSLCOMMERZ payment gateways.",
    },
    {
      q: "Can I take a trial session before committing to monthly tuition?",
      a: "Yes! Many verified teachers offer 30-minute introductory trial lessons at reduced rates so students and parents can evaluate compatibility and teaching methodology before scheduling regular classes.",
    },
    {
      q: "Are lessons recorded for revision?",
      a: "Teachers can enable class recording so students can rewatch critical problem-solving steps, mathematical proofs, and lecture notes anytime from their personal dashboard.",
    },
    {
      q: "What happens if a class is rescheduled or cancelled?",
      a: "Both teachers and students can request rescheduling through the interactive calendar. If a class cannot proceed, our automated booking ledger protects your balance with transparent refund or credit options.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#111111] selection:bg-[#F26522]/20 selection:text-[#111111]">
      {/* Unified Role-Aware Global Header */}
      <Navigation />

      {/* ─── 1. EDITORIAL HERO SECTION ─── */}
      <section className="relative pt-8 pb-16 sm:pt-14 sm:pb-24 overflow-hidden border-b border-[#E5E4DE]/60">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* LEFT COLUMN: Editorial Copy & CTAs */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-6 xl:col-span-6 space-y-6 sm:space-y-8"
            >
              {/* Eyebrow badge */}
              <motion.div variants={itemVariants} className="inline-flex items-center">
                <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#E5E4DE] text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-[#111111]/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <span className="w-2 h-2 rounded-full bg-[#F26522] animate-pulse" />
                  PERSONALIZED ONLINE LEARNING
                </span>
              </motion.div>

              {/* Large Editorial Headline */}
              <motion.div variants={itemVariants}>
                <h1 className="text-4xl sm:text-6xl lg:text-[4.25rem] font-bold tracking-[-0.04em] leading-[1.08] text-[#111111]">
                  Learn better.
                  <br />
                  <span className="text-[#F26522]">With the right teacher.</span>
                </h1>
              </motion.div>

              {/* Supporting Copy */}
              <motion.div variants={itemVariants}>
                <p className="text-base sm:text-lg lg:text-xl text-[#111111]/70 leading-relaxed max-w-xl font-normal">
                  Connect with verified teachers, book live one-to-one lessons, and learn inside a classroom built for real interaction.
                </p>
              </motion.div>

              {/* Primary and Secondary CTAs */}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <PrimaryButton
                  size="lg"
                  onClick={() => navigate("/teachers")}
                  className="sm:w-auto"
                >
                  Find a Tutor
                </PrimaryButton>
                <SecondaryButton
                  size="lg"
                  onClick={() => navigate("/teacher-application")}
                  className="sm:w-auto"
                >
                  Become a Tutor
                </SecondaryButton>
              </motion.div>

              {/* Trust Micro-Metrics */}
              <motion.div variants={itemVariants} className="pt-4 border-t border-[#E5E4DE]/60 flex flex-wrap items-center gap-6 text-xs text-[#111111]/70 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#F26522]" />
                  <span>100% Identity-Verified Faculty</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#16A34A]" />
                  <span>Live Interactive Whiteboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#2563EB]" />
                  <span>Safe Escrow Payments</span>
                </div>
              </motion.div>
            </motion.div>

            {/* RIGHT COLUMN: Polished Ecosystem Visual Composition */}
            <div className="lg:col-span-6 xl:col-span-6 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative mx-auto max-w-[580px]"
              >
                {/* Main Active Lesson Interface Card */}
                <div className="bg-white rounded-3xl border border-[#E5E4DE] p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] relative z-10">
                  {/* Top Bar of active lesson card */}
                  <div className="flex items-center justify-between pb-4 border-b border-[#E5E4DE]">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-[#16A34A] animate-pulse" />
                      <div>
                        <p className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                          Live Interactive Session
                        </p>
                        <p className="text-[11px] text-[#111111]/50">Room: VTP-CALCULUS-702</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F5F4EF] text-[#111111]/80 border border-[#E5E4DE]">
                      HD 1080p
                    </span>
                  </div>

                  {/* Visual Whiteboard Workspace Preview */}
                  <div className="mt-4 rounded-2xl bg-[#111111] text-white p-4 sm:p-5 relative overflow-hidden aspect-[16/10] flex flex-col justify-between">
                    {/* Background grid */}
                    <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />

                    {/* Teacher & Student Video Feeds Inset */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-semibold">{featuredTeacher.name}</span>
                        <span className="text-white/50 text-[10px]">Tutor</span>
                      </div>
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 text-xs">
                        <Mic className="w-3 h-3 text-emerald-400" />
                        <span className="text-white/80">Audio active</span>
                      </div>
                    </div>

                    {/* Mathematical/Curriculum Formula On Whiteboard */}
                    <div className="my-auto text-center relative z-10">
                      <span className="text-[11px] font-mono text-[#F26522] uppercase tracking-widest block mb-1">
                        Calculus & Derivatives
                      </span>
                      <p className="text-xl sm:text-2xl font-serif italic text-white/95">
                        f'(x) = lim &#916;x &rarr; 0 &nbsp; [f(x + &#916;x) - f(x)] / &#916;x
                      </p>
                      <p className="text-xs text-white/60 mt-1 font-mono">
                        Slope of the tangent at point P(x, y)
                      </p>
                    </div>

                    {/* Classroom Tool Icons Bar */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-3 relative z-10 text-xs text-white/70">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-md bg-white/10 text-white flex items-center gap-1 font-mono text-[11px]">
                          <PenTool className="w-3 h-3 text-[#F26522]" /> Stylus Pen
                        </span>
                        <span className="hidden sm:inline-block px-2 py-1 rounded-md bg-white/5 text-white/60 font-mono text-[11px]">
                          Graph: 2D Plane
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Live latency: 18ms
                      </div>
                    </div>
                  </div>

                  {/* Below Whiteboard: Scheduled Next Lesson & Quick Action */}
                  <div className="mt-4 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#F5F4EF] border border-[#E5E4DE] flex items-center justify-center text-[#111111]">
                        <GraduationCap className="w-5 h-5 text-[#F26522]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111111]">{featuredTeacher.title}</p>
                        <p className="text-[11px] text-[#111111]/50">Next session: Today at 5:00 PM</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/teachers")}
                      className="text-xs font-semibold text-[#F26522] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Book Session <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Floating Ecosystem Badge 1: Verified Faculty (Top Right) */}
                <motion.div
                  animate={shouldReduceMotion ? {} : { y: [-4, 4, -4] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-2 sm:-right-4 z-20 bg-white rounded-2xl border border-[#E5E4DE] px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-xl bg-[#F26522]/10 border border-[#F26522]/20 flex items-center justify-center text-[#F26522]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#111111]">Verified Faculty</p>
                    <p className="text-[10px] text-[#111111]/60">Identity & Degree checked</p>
                  </div>
                </motion.div>

                {/* Floating Ecosystem Badge 2: Real Progress (Bottom Left) */}
                <motion.div
                  animate={shouldReduceMotion ? {} : { y: [4, -4, 4] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="hidden sm:flex absolute -bottom-5 -left-4 z-20 bg-white rounded-2xl border border-[#E5E4DE] px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#111111]">Progress Analytics</p>
                    <p className="text-[10px] text-[#111111]/60">100% attendance & revision logs</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 2. TRUST SECTION ─── */}
      <section className="py-12 sm:py-16 bg-white border-b border-[#E5E4DE]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <SectionLabel number="01" text="Core Trust Foundations" className="justify-center mb-2" />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
              Built for serious academic learning
            </h2>
            <p className="text-xs sm:text-sm text-[#111111]/60 mt-1.5">
              Every detail engineered to give students and parents complete confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Verified Teachers",
                desc: "Every educator's university credentials, NID, and subject expertise are manually audited.",
              },
              {
                icon: Lock,
                title: "Secure Payments",
                desc: "Automated escrow with bKash, Nagad, and cards. Funds released only after class completion.",
              },
              {
                icon: Video,
                title: "Live Classroom",
                desc: "HD real-time audio/video, collaborative whiteboards, stylus support, and zero lag.",
              },
              {
                icon: BookOpen,
                title: "Personalized Learning",
                desc: "One-on-one tailored curriculum pacing, targeted homework help, and exam strategies.",
              },
              {
                icon: TrendingUp,
                title: "Real Progress Tracking",
                desc: "Automated session logs, study hours tracking, assignments, and transparent parent feedback.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[#E5E4DE] bg-[#FAF9F5] p-5 hover:border-[#111111]/30 hover:bg-white transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E4DE] flex items-center justify-center text-[#F26522] mb-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#111111] mb-1.5">{feature.title}</h3>
                <p className="text-xs text-[#111111]/65 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. FIND A TUTOR DISCOVERY SECTION ─── */}
      <section id="find-tutors" className="py-16 sm:py-24 bg-[#F8F7F4] border-b border-[#E5E4DE]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <SectionLabel number="02" text="Faculty Discovery" className="mb-2" />
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
                Find your educator
              </h2>
              <p className="text-xs sm:text-sm text-[#111111]/70 mt-1 max-w-xl">
                Browse verified tutors from top institutions, view verified credentials, and book lessons directly.
              </p>
            </div>
            <Link
              to="/teachers"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F26522] hover:text-[#111111] transition-colors"
            >
              <span>View all available teachers</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Search and Horizontal Desktop Filters */}
          <div className="bg-white rounded-2xl border border-[#E5E4DE] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] mb-8">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#111111]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by teacher name, subject, or university..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[#E5E4DE] bg-[#FAF9F5] text-xs sm:text-sm text-[#111111] placeholder:text-[#111111]/40 focus:outline-none focus:border-[#111111] transition-colors"
                />
              </div>

              {/* Class level selector */}
              <div className="hidden md:block">
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="px-4 py-2.5 rounded-full border border-[#E5E4DE] bg-[#FAF9F5] text-xs font-medium text-[#111111] focus:outline-none cursor-pointer"
                >
                  {levelOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "All" ? "All Levels" : opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                className="md:hidden inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#E5E4DE] bg-[#FAF9F5] text-xs font-semibold"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
              </button>
            </div>

            {/* Horizontal Subject Pills */}
            <div className="mt-4 pt-3 border-t border-[#E5E4DE]/60 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-semibold text-[#111111]/50 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                Subjects:
              </span>
              {subjectPills.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`text-xs px-3.5 py-1.5 rounded-full transition-all shrink-0 cursor-pointer font-medium ${
                    selectedSubject === sub
                      ? "bg-[#111111] text-white"
                      : "bg-[#F5F4EF] text-[#111111]/70 hover:bg-[#E5E4DE] hover:text-[#111111]"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Mobile Filter Drawer */}
            {mobileFilterOpen && (
              <div className="md:hidden mt-3 pt-3 border-t border-[#E5E4DE] space-y-2">
                <label className="text-[11px] font-semibold text-[#111111]/60 uppercase">Academic Level</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E4DE] bg-[#FAF9F5] text-xs text-[#111111]"
                >
                  {levelOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Teacher Cards Grid: Strictly Real Registered Tutors Only */}
          {filteredTeachers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeachers.map((tutor) => (
                <TutorCard
                  key={tutor._id || tutor.userId}
                  tutor={{
                    _id: tutor._id || tutor.userId,
                    name: tutor.name,
                    avatarUrl: tutor.avatarUrl,
                    subjects: tutor.subjects,
                    hourlyRate: tutor.hourlyRate,
                    monthlyTuition: tutor.monthlyTuition,
                    rating: tutor.rating,
                    reviewCount: tutor.reviewCount,
                    bio: tutor.bio || tutor.title,
                    isVerified: tutor.isVerified,
                  }}
                  onBook={(id) => navigate(`/teachers/${id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E4DE] p-12 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-[#F5F4EF] flex items-center justify-center mx-auto mb-3 text-[#111111]/40">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">No matching teachers found</h3>
              <p className="text-xs text-[#111111]/60 mt-1">
                Try selecting "All" subjects or searching for another term.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSubject("All");
                  setSelectedLevel("All");
                }}
                className="mt-4 px-4 py-2 rounded-full bg-[#111111] text-white text-xs font-semibold hover:bg-[#F26522] transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Bottom Explore CTA */}
          <div className="mt-12 text-center">
            <Link
              to="/teachers"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-[#E5E4DE] text-xs sm:text-sm font-semibold text-[#111111] hover:border-[#111111] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all"
            >
              <span>Explore all verified educators</span>
              <ArrowRight className="w-4 h-4 text-[#F26522]" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 4. HOW IT WORKS (3 STEPS) ─── */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-white border-b border-[#E5E4DE]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <SectionLabel number="03" text="The Learning Journey" className="justify-center mb-2" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
              How it works
            </h2>
            <p className="text-xs sm:text-sm text-[#111111]/60 mt-1.5">
              Three simple, transparent steps to achieve measurable academic progress.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="rounded-3xl border border-[#E5E4DE] bg-[#FAF9F5] p-6 sm:p-8 flex flex-col justify-between relative">
              <div>
                <span className="text-3xl font-extrabold text-[#F26522] font-mono block mb-4">
                  01
                </span>
                <h3 className="text-xl font-bold text-[#111111] mb-2.5">
                  Find your teacher
                </h3>
                <p className="text-xs sm:text-sm text-[#111111]/70 leading-relaxed">
                  Search by subject, academic curriculum (Bangla Medium, English Version, English Medium, Edexcel/Cambridge), and compare verified credentials, student ratings, and rates.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#E5E4DE] text-xs font-semibold text-[#111111]/60 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                Identity & education verified
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-3xl border border-[#E5E4DE] bg-[#FAF9F5] p-6 sm:p-8 flex flex-col justify-between relative">
              <div>
                <span className="text-3xl font-extrabold text-[#F26522] font-mono block mb-4">
                  02
                </span>
                <h3 className="text-xl font-bold text-[#111111] mb-2.5">
                  Book your lesson
                </h3>
                <p className="text-xs sm:text-sm text-[#111111]/70 leading-relaxed">
                  Select a date and time slot that aligns with your weekly routine. Pay safely through bKash, Nagad, or card with full payment protection.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#E5E4DE] text-xs font-semibold text-[#111111]/60 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                Instant calendar synchronization
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-3xl border border-[#E5E4DE] bg-[#FAF9F5] p-6 sm:p-8 flex flex-col justify-between relative">
              <div>
                <span className="text-3xl font-extrabold text-[#F26522] font-mono block mb-4">
                  03
                </span>
                <h3 className="text-xl font-bold text-[#111111] mb-2.5">
                  Learn live
                </h3>
                <p className="text-xs sm:text-sm text-[#111111]/70 leading-relaxed">
                  Step into our dedicated HD virtual classroom. Collaborate on the shared digital whiteboard, solve problem sets together, and track assignments in your dashboard.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#E5E4DE] text-xs font-semibold text-[#111111]/60 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                Browser-based, zero downloads
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. LIVE CLASSROOM SHOWCASE ─── */}
      <section className="py-16 sm:py-24 bg-[#111111] text-white border-b border-black">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold tracking-wider uppercase text-white/80 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#F26522]" />
              HUMAN-LED COLLABORATION
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              A classroom built for real teaching.
            </h2>
            <p className="text-xs sm:text-sm text-white/70 mt-2.5 leading-relaxed">
              Not a generic video call. An interactive digital academic studio designed specifically for educators and students.
            </p>
          </div>

          {/* Large Realistic Interactive Workspace Blueprint */}
          <div className="max-w-5xl mx-auto rounded-3xl border border-white/15 bg-[#18181B] p-4 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            {/* Top Workspace Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Physics Mechanics: Work & Energy
                </span>
                <span className="text-white/40 hidden sm:inline">|</span>
                <span className="text-white/60 hidden sm:inline">Session ID: VT-PHY-401</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-white/10 text-white font-mono text-[11px]">
                  Elapsed: 34:12
                </span>
                <button
                  onClick={() => navigate("/classroom")}
                  className="px-3.5 py-1 rounded-full bg-[#F26522] text-white font-semibold text-xs hover:bg-[#e05a1a] transition-colors cursor-pointer"
                >
                  Enter Demo Studio
                </button>
              </div>
            </div>

            {/* Central Stage: Whiteboard & Tools */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Whiteboard Canvas */}
              <div className="lg:col-span-8 bg-[#0D0D0E] rounded-2xl border border-white/10 p-6 aspect-[16/10] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs">
                    <PenTool className="w-3.5 h-3.5 text-[#F26522]" />
                    <span className="text-white/90">Collaborative Whiteboard</span>
                  </div>
                  <span className="text-[11px] text-white/50 font-mono">Page 2 of 4</span>
                </div>

                {/* Drawn Diagram & Equations */}
                <div className="my-auto text-center relative z-10 py-6">
                  <p className="text-xs uppercase tracking-widest text-[#F26522] font-mono mb-2">
                    Kinetic & Potential Conservation
                  </p>
                  <p className="text-2xl sm:text-3xl font-serif italic text-white/95 tracking-wide">
                    E_total = &#189; m v^2 + m g h = constant
                  </p>
                  <p className="text-xs text-white/60 font-mono mt-2">
                    Assuming zero friction at initial release point h_0
                  </p>
                </div>

                {/* Bottom Canvas Tools */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-white/60 relative z-10">
                  <div className="flex items-center gap-1.5">
                    {["Pen", "Eraser", "Math Formulas", "Shapes", "Grid", "Clear"].map((tool, i) => (
                      <span
                        key={tool}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium ${
                          i === 0
                            ? "bg-white/15 text-white"
                            : "hover:bg-white/5 hover:text-white cursor-pointer"
                        }`}
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Both users drawing</span>
                </div>
              </div>

              {/* Right Panel: Chat & Participants */}
              <div className="lg:col-span-4 bg-[#15161A] rounded-2xl border border-white/10 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Participants (2)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                      Connected
                    </span>
                  </div>

                  {/* Users List */}
                  <div className="mt-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#F26522] flex items-center justify-center font-bold text-[10px]">
                          SR
                        </div>
                        <div>
                          <p className="font-semibold text-white">Sarah Rahman</p>
                          <p className="text-[10px] text-white/50">Teacher (Host)</p>
                        </div>
                      </div>
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    </div>

                    <div className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[10px]">
                          AH
                        </div>
                        <div>
                          <p className="font-semibold text-white">Ayman Hasan</p>
                          <p className="text-[10px] text-white/50">Student (HSC 2026)</p>
                        </div>
                      </div>
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>

                  {/* Chat snippet */}
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-2">
                      Live Notes & Chat
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="bg-white/5 p-2 rounded-lg text-white/80">
                        <span className="text-[10px] text-[#F26522] font-bold block">Sarah Rahman</span>
                        Let's verify the derivative for the terminal velocity curve next.
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg text-white/80">
                        <span className="text-[10px] text-blue-400 font-bold block">Ayman Hasan</span>
                        Got it, sketching the diagram on page 3 now.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-white/40">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>End-to-end WebRTC secure stream</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Core Features Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10 max-w-5xl mx-auto">
            {[
              {
                title: "HD Video & Audio",
                desc: "Crystal-clear WebRTC infrastructure with intelligent bandwidth adaptation for smooth connection.",
              },
              {
                title: "Shared Whiteboard",
                desc: "Real-time vector canvas with stylus pressure sensitivity, graph coordinate grids, and geometry tools.",
              },
              {
                title: "Screen Sharing",
                desc: "Present slide decks, lecture PDFs, code editors, and past examination papers instantly.",
              },
              {
                title: "In-Class Worksheet Tools",
                desc: "Solve worksheets side-by-side and receive instant annotations and corrections from your teacher.",
              },
            ].map((f, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-bold text-white mb-1.5">{f.title}</h4>
                <p className="text-xs text-white/65 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. INTERACTIVE FAQ SECTION ─── */}
      <section id="faq" className="py-16 sm:py-24 bg-white border-b border-[#E5E4DE]">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-14">
            <SectionLabel number="04" text="Common Questions" className="justify-center mb-2" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
              Frequently asked questions
            </h2>
            <p className="text-xs sm:text-sm text-[#111111]/60 mt-1.5">
              Everything you need to know about tutoring, payments, and the live classroom.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = faqOpen === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-[#E5E4DE] bg-[#FAF9F5] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setFaqOpen(isOpen ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-sm font-bold text-[#111111]">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#111111]/50 transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180 text-[#F26522]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-xs sm:text-sm text-[#111111]/70 leading-relaxed border-t border-[#E5E4DE]/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 7. FINAL CALL-TO-ACTION BANNER ─── */}
      <section id="contact" className="py-16 sm:py-24 bg-[#FAF9F5] border-b border-[#E5E4DE]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="rounded-3xl border border-[#E5E4DE] bg-white p-8 sm:p-14 text-center max-w-4xl mx-auto shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
            <span className="w-12 h-12 rounded-2xl bg-[#F5F4EF] border border-[#E5E4DE] flex items-center justify-center mx-auto mb-4 text-[#F26522]">
              <GraduationCap className="w-6 h-6" />
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#111111]">
              Ready to learn better?
            </h2>
            <p className="text-xs sm:text-base text-[#111111]/70 mt-3 max-w-lg mx-auto leading-relaxed">
              Join thousands of students and verified educators collaborating every day on Bangladesh's premier live tutoring platform.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <PrimaryButton
                size="lg"
                onClick={() => navigate("/teachers")}
              >
                Find a Tutor
              </PrimaryButton>
              <SecondaryButton
                size="lg"
                onClick={() => navigate("/teacher-application")}
              >
                Apply as an Educator
              </SecondaryButton>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. EDITORIAL FOOTER ─── */}
      <footer className="bg-[#111111] text-white py-14 border-t border-black">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
            {/* Column 1: Brand & Overview */}
            <div className="space-y-4">
              <BrandLogo variant="horizontal" size="md" isDark={true} />
              <p className="text-xs text-white/60 leading-relaxed">
                Virtual Tutor Pro is Bangladesh's premier live one-to-one education technology platform connecting students with verified educators.
              </p>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>All systems operational</span>
              </div>
            </div>

            {/* Column 2: Platform Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
                Platform
              </h4>
              <ul className="space-y-2.5 text-xs text-white/70">
                <li>
                  <Link to="/teachers" className="hover:text-white transition-colors">
                    Find Tutors
                  </Link>
                </li>
                <li>
                  <Link to="/teacher-application" className="hover:text-white transition-colors">
                    Become a Tutor
                  </Link>
                </li>
                <li>
                  <Link to="/students" className="hover:text-white transition-colors">
                    Student Directory
                  </Link>
                </li>
                <li>
                  <Link to="/classroom" className="hover:text-white transition-colors">
                    Virtual Classroom
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Academic Resources */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
                Academics
              </h4>
              <ul className="space-y-2.5 text-xs text-white/70">
                <li>
                  <Link to="/community" className="hover:text-white transition-colors">
                    Community Forum
                  </Link>
                </li>
                <li>
                  <Link to="/ai-assistant" className="hover:text-white transition-colors">
                    AI Study Companion
                  </Link>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Legal */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
                Trust & Legal
              </h4>
              <ul className="space-y-2.5 text-xs text-white/70">
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setContactOpen(true)}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Contact Faculty Support
                  </button>
                </li>
                <li>
                  <Link to="/admin" className="hover:text-[#F26522] transition-colors">
                    Admin Portal
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Timezone */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
            <p>&copy; {new Date().getFullYear()} Virtual Tutor Pro. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <span>Timezone: Asia/Dhaka (GMT+6)</span>
              <span>&bull;</span>
              <span>UddoktaPay & SSLCOMMERZ Protected</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Support Modal */}
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
