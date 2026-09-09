import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { subjects } from "@/lib/data";
import { BrandLogo } from "@/components/BrandLogo";
import { LazyImage } from "@/components/images/LazyImage";
import { HERO_IMAGE, LIVE_CLASS_IMAGE } from "@/lib/images";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  Video,
  Users,
  BookOpen,
  Calendar,
  Presentation,
  CheckCircle2,
  Sparkles,
  Search,
  GraduationCap,
  Star,
  Clock,
  Laptop,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { CinematicHeroBackground } from "@/components/CinematicHeroBackground";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Safely query public teachers list (unauthenticated query)
  const teachersQuery = useQuery(api.teachers.list);
  const teachers = teachersQuery ?? [];

  // Filter teachers by subject
  const filteredTeachers = useMemo(() => {
    if (selectedSubject === "All") return teachers.slice(0, 6);
    return teachers
      .filter((t) =>
        t.subjects?.some((s) => s.toLowerCase().includes(selectedSubject.toLowerCase()))
      )
      .slice(0, 6);
  }, [teachers, selectedSubject]);

  const handleAuthAction = (path: string = "/auth") => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate(path);
    }
  };

  const faqItems = [
    {
      q: "How do live 1-on-1 sessions work?",
      a: "Once you select a tutor, you can choose an available time slot on their calendar. At lesson time, both you and the tutor join an interactive classroom equipped with real-time HD video, a shared collaborative whiteboard, live document sharing, and chat.",
    },
    {
      q: "How are educators vetted and verified?",
      a: "Every educator undergoes a multi-step verification process, including academic credential validation, teaching background review, and identity confirmation before they can teach students on the platform.",
    },
    {
      q: "Can I try a session or reschedule if needed?",
      a: "Yes! Tutors offer introductory trial lessons, and sessions can be rescheduled with up to 12 hours advance notice directly from your student dashboard without penalty.",
    },
    {
      q: "What equipment do I need for live classes?",
      a: "A standard computer, laptop, or tablet with a web browser, webcam, microphone, and a reliable internet connection is all you need. No software installation is required.",
    },
    {
      q: "How does the AI Study Assistant help after class?",
      a: "Following each class session, the AI Study Assistant generates automated lesson summaries, highlights key concepts, and creates practice questions tailored to what you just learned.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-teal-500/30 selection:text-teal-200 font-sans antialiased overflow-x-hidden">
      {/* ─── CONTINUOUS CINEMATIC MOTION BACKGROUND (Layers 1-6) ─── */}
      <CinematicHeroBackground />

      {/* ─── HEADER / NAVIGATION ─── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Left: Brand Logo */}
          <div className="flex items-center">
            <BrandLogo
              variant="horizontal"
              size="md"
              isDark={true}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:opacity-90 transition-opacity"
            />
          </div>

          {/* Center: Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <a
              href="#tutors"
              className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all"
            >
              Tutors
            </a>
            <a
              href="#how-it-works"
              className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all"
            >
              Features
            </a>
            <a
              href="#faqs"
              className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all"
            >
              FAQs
            </a>
          </nav>

          {/* Right: Auth CTAs & Mobile Burger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAuthAction("/auth")}
              className="hidden sm:inline-flex text-xs font-semibold uppercase tracking-wider text-white/75 hover:text-white px-4 py-2.5 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/[0.04] transition-all"
            >
              {isAuthenticated ? "Dashboard" : "Login"}
            </button>

            <button
              onClick={() => handleAuthAction("/auth")}
              className="btn-metallic-solid px-5 py-2.5 text-xs uppercase tracking-wider font-bold rounded-full shadow-lg shadow-white/10 hover:shadow-white/20 transition-all active:scale-95"
            >
              Get Started
            </button>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-white/10 bg-black/95 backdrop-blur-2xl px-6 py-6 space-y-4"
            >
              <div className="flex flex-col gap-3">
                <a
                  href="#tutors"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-white/80 hover:text-white py-2"
                >
                  Tutors
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-white/80 hover:text-white py-2"
                >
                  How It Works
                </a>
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-white/80 hover:text-white py-2"
                >
                  Features
                </a>
                <a
                  href="#faqs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-white/80 hover:text-white py-2"
                >
                  FAQs
                </a>
              </div>
              <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleAuthAction("/auth");
                  }}
                  className="w-full py-3 text-center text-xs font-bold uppercase tracking-wider rounded-xl border border-white/15 text-white bg-white/5"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Sign In"}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleAuthAction("/auth");
                  }}
                  className="btn-metallic-solid w-full py-3 text-center text-xs font-bold uppercase tracking-wider rounded-xl"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── HERO SECTION (z-index 2: Above animation and readability layer) ─── */}
      <section className="relative z-[2] pt-16 sm:pt-24 pb-20 lg:pt-32 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center">
          {/* Eyebrow Floating Pill */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/15 backdrop-blur-md text-white/90 text-xs font-semibold mb-8 shadow-inner"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Interactive Live Education Platform</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </motion.div>

          {/* Large Editorial Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-white"
          >
            Learn from Real Tutors.{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-300 via-cyan-200 to-indigo-300">
              Practice with AI.
            </span>{" "}
            Grow with Confidence.
          </motion.h1>

          {/* Editorial Lede */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-7 text-base sm:text-xl text-white/65 max-w-2xl leading-relaxed font-normal"
          >
            Book verified 1-on-1 live classes with certified educators. Collaborate with real-time digital whiteboards, post-lesson AI summaries, and adaptive progress milestones.
          </motion.p>

          {/* CTA Group */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="#tutors"
              className="btn-metallic-solid px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-full flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
            >
              <span>Explore Tutors</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="#how-it-works"
              className="btn-metallic-ghost px-8 py-4 text-sm font-semibold tracking-wide rounded-full flex items-center gap-2 hover:bg-white/10 transition-all"
            >
              <span>How It Works</span>
              <ArrowUpRight className="w-4 h-4 text-white/60" />
            </a>
          </motion.div>

          {/* Live Trust Metrics Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-14 pt-8 border-t border-white/10 w-full max-w-3xl flex flex-wrap items-center justify-center sm:justify-between gap-6 text-xs text-white/60"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                <strong className="text-white font-semibold">{teachers.length > 0 ? teachers.length : "50+"} Verified</strong> Tutors
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
              <span>
                <strong className="text-white font-semibold">4.9/5</strong> Average Student Rating
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Video className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong className="text-white font-semibold">100% Live</strong> Interactive Classroom
              </span>
            </div>
          </motion.div>
        </div>

        {/* Hero Visual Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="mt-16 sm:mt-20 relative max-w-5xl mx-auto rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-white/15 via-white/5 to-transparent border border-white/15 shadow-[0_20px_80px_rgba(0,0,0,0.8)]"
        >
          <div className="relative rounded-2xl overflow-hidden bg-zinc-950 aspect-[16/9]">
            <LazyImage
              src={HERO_IMAGE}
              alt="Live interactive tutoring session with whiteboard and video call"
              className="w-full h-full object-cover object-center filter brightness-95"
            />
            {/* Subtle Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

            {/* Floating Live Badge */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/20 backdrop-blur-md text-xs font-semibold text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>HD Video & Whiteboard Live</span>
            </div>

            {/* Floating Bottom Milestone Badge */}
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 max-w-xs p-3.5 rounded-2xl bg-black/75 border border-white/15 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Interactive Session</p>
                  <p className="text-[11px] text-teal-300 font-medium">Real-time collaborative learning</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── TUTORS SECTION ─── */}
      <section id="tutors" className="relative z-10 py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-teal-300 uppercase tracking-wider mb-3">
              Verified Educators
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Learn from Top Instructors
            </h2>
            <p className="mt-2 text-base text-white/60 max-w-lg">
              Every educator is credential-checked and student-reviewed. Filter by subject to find your ideal mentor.
            </p>
          </div>

          <button
            onClick={() => navigate("/teachers")}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-400 hover:text-teal-300 transition-colors"
          >
            <span>View All Instructors</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {["All", "Mathematics", "English", "Science", "Physics", "Chemistry", "Computer Science"].map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedSubject === sub
                  ? "bg-white text-black font-bold shadow-md shadow-white/20"
                  : "bg-white/[0.04] text-white/70 hover:text-white border border-white/10 hover:border-white/20"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Tutors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((tutor) => (
            <div
              key={tutor._id}
              onClick={() => navigate(`/teachers/${tutor._id}`)}
              className="group relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/25 p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/20 shrink-0 flex items-center justify-center font-bold text-white text-sm">
                      {tutor.avatarUrl || tutor.image ? (
                        <img
                          src={tutor.avatarUrl || tutor.image}
                          alt={tutor.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        tutor.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors flex items-center gap-1.5">
                        <span>{tutor.name}</span>
                        {tutor.isVerified && <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />}
                      </h3>
                      <p className="text-xs text-white/50">Verified Instructor</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white/[0.07] px-2.5 py-1 rounded-full border border-white/10 text-xs font-semibold text-white">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{tutor.rating ? tutor.rating.toFixed(1) : "4.9"}</span>
                  </div>
                </div>

                {tutor.bio && (
                  <p className="text-xs text-white/65 line-clamp-2 leading-relaxed mb-4">
                    {tutor.bio}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {tutor.subjects?.slice(0, 3).map((sub, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-medium bg-white/[0.05] text-white/80 px-2.5 py-0.5 rounded-full border border-white/10"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-lg font-extrabold text-white">
                    ${tutor.hourlyRate ?? 35}
                  </span>
                  <span className="text-xs text-white/50"> / hour</span>
                </div>

                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredTeachers.length === 0 && (
          <div className="text-center py-16 px-4 rounded-2xl border border-white/10 bg-white/[0.02]">
            <Users className="w-10 h-10 text-white/40 mx-auto mb-3" />
            <p className="text-sm text-white/70">No instructors found for this subject currently.</p>
            <button
              onClick={() => setSelectedSubject("All")}
              className="mt-3 text-xs font-bold uppercase tracking-wider text-teal-400 underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* ─── HOW IT WORKS SECTION ─── */}
      <section id="how-it-works" className="relative z-10 py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-3">
            Streamlined Process
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How LiveClass Works
          </h2>
          <p className="mt-3 text-base text-white/60">
            From discovering your mentor to attending live interactive sessions in four simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              title: "Find Your Educator",
              desc: "Filter by subject, level, language preference, and rate to match with verified experts.",
              icon: Search,
            },
            {
              step: "02",
              title: "Schedule Your Slot",
              desc: "Pick an available time that fits your calendar with automatic timezone synchronization.",
              icon: Calendar,
            },
            {
              step: "03",
              title: "Join Live Classroom",
              desc: "Experience real-time interactive video, shared whiteboard, document exchange, and code tools.",
              icon: Video,
            },
            {
              step: "04",
              title: "Review & Progress",
              desc: "Access AI session summaries, practice homework, and track your milestone achievements.",
              icon: GraduationCap,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="relative p-6 sm:p-7 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between"
            >
              <div>
                <span className="text-2xl font-black text-white/20 font-mono block mb-4">
                  {item.step}
                </span>
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 mb-4">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES / CLASSROOM SHOWCASE ─── */}
      <section id="features" className="relative z-10 py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-3">
              Modern Learning Tools
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              An Interactive Digital Classroom Crafted for Deep Focus
            </h2>
            <p className="mt-4 text-base text-white/65 leading-relaxed">
              No pre-recorded lectures. No impersonal chatbots. You get dedicated time with a live tutor using real-time collaborative whiteboards, smart homework feedback, and screen sharing.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { title: "Ultra HD Video & Audio", desc: "Low-latency streaming built for education", icon: Video },
                { title: "Interactive Canvas", desc: "Draw formulas, diagrams, and solve live", icon: Presentation },
                { title: "Smart Study Summaries", desc: "AI-generated lesson digests and key takeaways", icon: BookOpen },
                { title: "Progress Analytics", desc: "Track subject mastery and study hours", icon: CheckCircle2 },
              ].map((feat, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <feat.icon className="w-5 h-5 text-teal-400 mb-2" />
                  <h4 className="text-xs font-bold text-white">{feat.title}</h4>
                  <p className="text-[11px] text-white/50 mt-1 leading-normal">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-white/15 via-white/5 to-transparent border border-white/15 shadow-2xl">
            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 aspect-[4/3]">
              <LazyImage
                src={LIVE_CLASS_IMAGE}
                alt="Digital whiteboard interface with video tiles and math diagrams"
                className="w-full h-full object-cover object-center filter brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-black/80 backdrop-blur-md border border-white/15">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
                    <span className="text-xs font-bold text-white">Live Whiteboard Active</span>
                  </div>
                  <span className="text-[11px] text-white/60">Low Latency Sync</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQS SECTION ─── */}
      <section id="faqs" className="relative z-10 py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-white/10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-teal-300 uppercase tracking-wider mb-3">
            Got Questions?
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-white/60">
            Everything you need to know about the platform, bookings, and tutors.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden transition-colors"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
              >
                <span className="text-sm sm:text-base font-bold text-white">{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-white/60 transition-transform duration-300 shrink-0 ${
                    activeFaq === idx ? "rotate-180 text-teal-400" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-white/65 leading-relaxed border-t border-white/5">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CALL TO ACTION BANNER ─── */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
        <div className="rounded-3xl p-8 sm:p-14 bg-gradient-to-br from-teal-900/40 via-zinc-900 to-black border border-white/15 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Ready to Accelerate Your Learning Journey?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/70 leading-relaxed">
              Join thousands of students and certified educators connecting through live, interactive classrooms today.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => handleAuthAction("/auth")}
                className="btn-metallic-solid px-8 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-full shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                Get Started for Free
              </button>

              <button
                onClick={() => handleAuthAction("/auth")}
                className="btn-metallic-ghost px-8 py-4 text-xs sm:text-sm font-semibold tracking-wide rounded-full hover:bg-white/10 transition-all"
              >
                Apply as a Tutor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <BrandLogo variant="horizontal" size="sm" isDark={true} />

          <div className="flex items-center gap-6 text-xs text-white/60">
            <a href="#tutors" className="hover:text-white transition-colors">
              Tutors
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#faqs" className="hover:text-white transition-colors">
              FAQs
            </a>
          </div>

          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} LiveClass • Virtual Tutor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
