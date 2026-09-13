import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getAllTeacherApplications, LEGACY_FAKE_IDS, TEACHER_STORE_EVENT } from "@/lib/teacher-store";
import { normalizeTeacherData, AuthoritativeTeacher } from "@/lib/teacher-authoritative-data";
import { BrandLogo } from "@/components/BrandLogo";
import {
  SectionLabel,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
  PillButton,
  StatBlock,
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
  Menu,
  X,
  PenTool,
  ArrowRight,
  Lock,
  Wallet,
  ChevronDown,
  Award,
  Monitor,
  FileText,
  Check,
  CreditCard,
  MessageCircle,
  TrendingUp,
  Layers,
  ChevronRight,
  Filter,
  ExternalLink,
  QrCode,
} from "lucide-react";

// Subtle ambient particle canvas for warm breathing atmosphere
function AmbientAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 800);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || 800;
    };
    window.addEventListener("resize", handleResize);

    const particleCount = 24;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.15 - Math.random() * 0.25,
      radius: 1.2 + Math.random() * 2,
      alpha: 0.12 + Math.random() * 0.2,
      hue: Math.random() > 0.5 ? 24 : 36, // Orange & amber warm tints
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 55%, ${p.alpha})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 55%, 0.3)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.3, 0.45, 0.3],
          x: [0, 15, 0],
          y: [0, -10, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 left-1/4 w-96 h-96 rounded-full bg-radial from-[#F26522]/10 via-[#F26522]/3 to-transparent blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.08, 0.96, 1.08],
          opacity: [0.2, 0.35, 0.2],
          x: [0, -20, 0],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-24 right-1/4 w-[28rem] h-[28rem] rounded-full bg-radial from-[#F7941D]/8 via-[#F26522]/2 to-transparent blur-3xl"
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />
    </div>
  );
}

// Audio visualizer waveform bars component
function LiveWaveform() {
  const heights = [6, 14, 8, 16, 10, 15, 7, 12];
  return (
    <div className="flex items-center gap-1 h-5 px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          animate={{
            height: [h, Math.max(4, 18 - h), h],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 0.85 + (i % 4) * 0.15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.08,
          }}
          className="w-1 bg-[#F26522] rounded-full"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("All");

  // Active accordion FAQ index
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);

  // Shrink-on-scroll header behavior
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Query verified teachers
  const teachersQuery = useQuery(api.teachers.list);
  const [localTeacherApps, setLocalTeacherApps] = useState(() => getAllTeacherApplications());

  useEffect(() => {
    const handleStoreChange = () => {
      setLocalTeacherApps(getAllTeacherApplications());
    };
    window.addEventListener(TEACHER_STORE_EVENT, handleStoreChange);
    return () => window.removeEventListener(TEACHER_STORE_EVENT, handleStoreChange);
  }, []);

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
    "English",
    "Chemistry",
    "Biology",
    "Computer Science",
    "Higher Math",
  ];

  // Filter teachers by search query and subject
  const filteredTeachers = useMemo(() => {
    return teachers
      .filter((t) => {
        const matchesSubject =
          selectedSubject === "All" ||
          t.subjects?.some((s) => s.toLowerCase().includes(selectedSubject.toLowerCase()));
        const matchesLevel =
          selectedLevel === "All" ||
          t.classLevels?.some((l) => l.toLowerCase().includes(selectedLevel.toLowerCase()));
        const matchesSearch =
          !searchQuery.trim() ||
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subjects?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
          t.title?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSubject && matchesLevel && matchesSearch;
      })
      .slice(0, 6);
  }, [teachers, selectedSubject, selectedLevel, searchQuery]);

  // Motion physics configuration
  const shouldReduceMotion = useReducedMotion();
  const heroMouseX = useMotionValue(0);
  const heroMouseY = useMotionValue(0);

  const springConfig = { damping: 26, stiffness: 80, mass: 0.5 };
  const smoothX = useSpring(heroMouseX, springConfig);
  const smoothY = useSpring(heroMouseY, springConfig);

  const heroCardRotateX = useTransform(smoothY, [-400, 400], shouldReduceMotion ? [0, 0] : [3, -3]);
  const heroCardRotateY = useTransform(smoothX, [-600, 600], shouldReduceMotion ? [0, 0] : [-3.5, 3.5]);
  const heroBadgeParallaxX = useTransform(smoothX, (v) => (shouldReduceMotion ? 0 : v * 0.025));
  const heroBadgeParallaxY = useTransform(smoothY, (v) => (shouldReduceMotion ? 0 : v * 0.025));

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      heroMouseX.set(e.clientX - centerX);
      heroMouseY.set(e.clientY - centerY);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [heroMouseX, heroMouseY]);

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] },
    },
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#111111] font-sans antialiased selection:bg-[#F26522]/20 selection:text-[#111111] relative">
      {/* ─── 1. GLOBAL HEADER ─── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#F8F7F4]/90 backdrop-blur-md border-b border-[#E5E4DE] shadow-xs py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <BrandLogo
              variant="horizontal"
              size="md"
              showSubtext={true}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="cursor-pointer"
            />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E5E4DE] bg-white/80 backdrop-blur-md text-xs font-semibold text-[#111111]/80 shadow-2xs">
            <Link
              to="/teachers"
              className="px-3.5 py-1.5 rounded-full hover:text-[#111111] hover:bg-[#FAF9F5] transition-colors"
            >
              Find Tutors
            </Link>
            <a
              href="#how-it-works"
              className="px-3.5 py-1.5 rounded-full hover:text-[#111111] hover:bg-[#FAF9F5] transition-colors"
            >
              How It Works
            </a>
            <Link
              to="/teacher-application"
              className="px-3.5 py-1.5 rounded-full hover:text-[#111111] hover:bg-[#FAF9F5] transition-colors"
            >
              Become a Tutor
            </Link>
            <Link
              to="/community"
              className="px-3.5 py-1.5 rounded-full hover:text-[#111111] hover:bg-[#FAF9F5] transition-colors"
            >
              Community
            </Link>
            <a
              href="#faq"
              className="px-3.5 py-1.5 rounded-full hover:text-[#111111] hover:bg-[#FAF9F5] transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-5 py-2.5 rounded-full bg-[#111111] hover:bg-[#222222] text-white font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/auth?mode=login")}
                  className="px-4 py-2 rounded-full text-[#111111]/70 hover:text-[#111111] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate("/auth?mode=signup")}
                  className="px-5 py-2.5 rounded-full bg-[#111111] hover:bg-[#222222] text-white font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Start Learning
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#111111] hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden border-b border-[#E5E4DE] bg-white px-4 pt-2 pb-6 space-y-3 overflow-hidden shadow-md"
            >
              <Link
                to="/teachers"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-[#111111]/80 hover:text-[#111111]"
              >
                Find Tutors
              </Link>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-[#111111]/80 hover:text-[#111111]"
              >
                How It Works
              </a>
              <Link
                to="/teacher-application"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-[#111111]/80 hover:text-[#111111]"
              >
                Become a Tutor
              </Link>
              <Link
                to="/community"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-[#111111]/80 hover:text-[#111111]"
              >
                Community
              </Link>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-[#111111]/80 hover:text-[#111111]"
              >
                FAQ
              </a>
              <div className="pt-3 border-t border-[#E5E4DE] flex flex-col gap-2">
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/dashboard");
                    }}
                    className="w-full py-2.5 rounded-full bg-[#111111] text-white font-semibold text-xs text-center"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/auth?mode=login");
                      }}
                      className="w-full py-2 rounded-full border border-[#E5E4DE] text-[#111111] font-semibold text-xs text-center"
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/auth?mode=signup");
                      }}
                      className="w-full py-2.5 rounded-full bg-[#111111] text-white font-semibold text-xs text-center"
                    >
                      Start Learning
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section className="relative pt-8 pb-20 sm:pt-14 sm:pb-28 overflow-hidden">
        <AmbientAtmosphere />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-6 space-y-6 text-left"
            >
              {/* Eyebrow */}
              <motion.div variants={itemVariants}>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF9F5] border border-[#E5E4DE] text-[#111111] text-xs font-bold tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#F26522] animate-pulse" />
                  PERSONALIZED ONLINE LEARNING
                </span>
              </motion.div>

              {/* Main Headline */}
              <motion.div variants={itemVariants}>
                <h1 className="text-4xl sm:text-6xl xl:text-[4.25rem] font-bold tracking-[-0.03em] leading-[1.08] text-[#111111]">
                  Learn better.
                  <br />
                  <span className="text-[#F26522]">With the right teacher.</span>
                </h1>
              </motion.div>

              {/* Supporting Text */}
              <motion.div variants={itemVariants}>
                <p className="text-base sm:text-lg text-[#111111]/70 leading-relaxed max-w-xl">
                  Connect with verified teachers, book live one-to-one lessons, and learn in a professional online classroom.
                </p>
              </motion.div>

              {/* CTAs */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  onClick={() => navigate("/teachers")}
                  className="px-7 py-3.5 rounded-full bg-[#111111] hover:bg-[#222222] text-white font-bold text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <span>Find a Tutor</span>
                  <ArrowRight className="w-4 h-4 text-[#F26522]" />
                </button>
                <button
                  onClick={() => navigate("/teacher-application")}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-[#FAF9F5] text-[#111111] font-bold text-sm transition-all border border-[#E5E4DE] shadow-xs active:scale-95 cursor-pointer"
                >
                  Become a Tutor
                </button>
              </motion.div>

              {/* Quick Trust Highlights */}
              <motion.div variants={itemVariants} className="pt-6 border-t border-[#E5E4DE] grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xl sm:text-2xl font-black text-[#111111]">100%</p>
                  <p className="text-xs text-[#111111]/60 font-medium mt-0.5">Verified Teachers</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-[#111111]">1-on-1</p>
                  <p className="text-xs text-[#111111]/60 font-medium mt-0.5">Live Interactive</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-[#111111]">Escrow</p>
                  <p className="text-xs text-[#111111]/60 font-medium mt-0.5">Secure Payments</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Visual Composition with 3D Mouse Parallax */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              style={{ rotateX: heroCardRotateX, rotateY: heroCardRotateY }}
              className="lg:col-span-6 relative perspective-[1000px]"
            >
              {/* Floating Verified Badge */}
              <motion.div
                style={{ x: heroBadgeParallaxX, y: heroBadgeParallaxY }}
                className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-[#E5E4DE] shadow-lg absolute -top-5 -left-5 z-20"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#111111]">Verified University Faculty</p>
                  <p className="text-[10px] text-[#111111]/60">NID & Credentials Screened</p>
                </div>
              </motion.div>

              {/* Main Classroom Studio Dark Card */}
              <div className="bg-[#111111] rounded-3xl p-6 sm:p-7 border border-[#111111] text-white shadow-2xl relative overflow-hidden">
                {/* Top Studio Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold tracking-wide">Live Classroom #842</span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70">
                      WebRTC Low Latency
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LiveWaveform />
                    <span className="text-xs text-white/60 font-mono">42:15</span>
                  </div>
                </div>

                {/* Whiteboard Interactive Canvas Preview */}
                <div className="my-5 p-5 bg-[#191919] rounded-2xl border border-white/10 relative overflow-hidden aspect-video flex flex-col justify-between">
                  <div className="space-y-1 relative z-10 font-mono text-xs text-white/80">
                    <p className="text-[#F26522] font-bold">// HSC Higher Mathematics · Calculus:</p>
                    <p className="text-white text-sm font-semibold">∫ (3x² + 4x - 5) dx = x³ + 2x² - 5x + C</p>
                    <p className="text-emerald-400 text-[11px] pt-1">✓ Step verified: d/dx(x³ + 2x² - 5x + C) = 3x² + 4x - 5</p>
                  </div>

                  {/* Animated SVG trajectory drawing the integral curve */}
                  <motion.div
                    animate={{
                      x: [0, 60, 30, 90, 0],
                      y: [0, 15, -8, 10, 0],
                    }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-12 right-12 w-32 h-16 pointer-events-none opacity-50"
                  >
                    <svg viewBox="0 0 100 50" className="w-full h-full stroke-[#F26522] fill-none stroke-2">
                      <motion.path
                        d="M 10,25 Q 50,5 90,25 T 100,45"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </svg>
                  </motion.div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-white/60 relative z-10">
                    <span className="flex items-center gap-1.5 text-white/80">
                      <PenTool className="w-3.5 h-3.5 text-[#F26522]" /> Tutor Cursor: Active Annotation
                    </span>
                    <span className="text-[#F26522] font-semibold">Real-Time Sync</span>
                  </div>
                </div>

                {/* Bottom Participant Strip */}
                <div className="flex items-center justify-between pt-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#F26522] text-white flex items-center justify-center font-bold text-xs">
                      TR
                    </div>
                    <div>
                      <p className="font-bold text-white leading-tight">Tanvir Rahman</p>
                      <p className="text-[10px] text-white/60">Physics Specialist (BUET)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/classroom/demo")}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Enter Live Preview
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 3. TRUST SIGNALS SECTION ─── */}
      <section className="py-12 border-y border-[#E5E4DE] bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
            {[
              {
                icon: ShieldCheck,
                title: "Verified Teachers",
                desc: "Certified academic credentials",
              },
              {
                icon: Lock,
                title: "Secure Payments",
                desc: "Protected tuition escrow",
              },
              {
                icon: Video,
                title: "Live Classroom",
                desc: "HD video & digital board",
              },
              {
                icon: Sparkles,
                title: "Personalized Learning",
                desc: "Tailored to your syllabus",
              },
              {
                icon: TrendingUp,
                title: "Progress Tracking",
                desc: "Milestones & study hours",
              },
            ].map((pillar, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF9F5] border border-[#E5E4DE] flex items-center justify-center text-[#F26522] shrink-0 shadow-2xs">
                  <pillar.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#111111]">{pillar.title}</h4>
                  <p className="text-[11px] text-[#111111]/60 mt-0.5 leading-snug">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. FIND YOUR TEACHER SECTION ─── */}
      <section id="find-tutors" className="py-20 sm:py-28">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <SectionLabel label="01" text="QUALIFIED INSTRUCTORS" />
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111] mt-2">
                Find your dedicated teacher.
              </h2>
              <p className="text-sm text-[#111111]/70 mt-1 max-w-xl">
                Browse verified educators with proven track records across National Curriculum, English Medium, and Admissions.
              </p>
            </div>
            <button
              onClick={() => navigate("/teachers")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111111] hover:text-[#F26522] transition-colors self-start md:self-auto cursor-pointer"
            >
              <span>View all teachers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="bg-white rounded-3xl border border-[#E5E4DE] p-4 sm:p-5 mb-8 shadow-xs space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#111111]/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teachers or subjects (e.g. Physics, Calculus, English)..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FAF9F5] border border-[#E5E4DE] text-sm text-[#111111] placeholder:text-[#111111]/40 focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-all"
              />
            </div>

            {/* Subject Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {subjectPills.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedSubject === sub
                      ? "bg-[#111111] text-white shadow-xs"
                      : "bg-[#FAF9F5] text-[#111111]/70 hover:text-[#111111] hover:bg-[#F5F4EF] border border-[#E5E4DE]"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Tutor Grid */}
          {filteredTeachers.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredTeachers.map((tutor) => (
                <motion.div key={tutor.userId || tutor._id} variants={itemVariants}>
                  <TutorCard
                    tutor={tutor as any}
                    theme="light"
                    onBook={() => navigate(`/teachers/${tutor.userId || tutor._id}`)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E5E4DE] p-8 shadow-xs">
              <GraduationCap className="w-12 h-12 text-[#F26522] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#111111]">No teachers match your search</h3>
              <p className="text-xs text-[#111111]/60 mt-1 max-w-sm mx-auto">
                Try adjusting your search query or subject filters to find available tutors.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSubject("All");
                }}
                className="mt-4 px-5 py-2 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-[#222222] transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── 5. HOW IT WORKS SECTION ─── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white border-y border-[#E5E4DE]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <SectionLabel label="02" text="SIMPLE THREE-STEP PROCESS" className="justify-center" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111] mt-2">
              How Virtual Tutor works
            </h2>
            <p className="text-sm text-[#111111]/70 mt-2">
              From finding the ideal educator to learning live on our interactive whiteboard in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {[
              {
                step: "01",
                title: "Find your teacher",
                desc: "Filter by subject, grade level, curriculum, and budget. Review transparent verified ratings and educational credentials.",
                icon: Search,
              },
              {
                step: "02",
                title: "Book your lesson",
                desc: "Choose a time slot that matches your schedule. Confirm your booking with zero hassle through automated payment escrow.",
                icon: Calendar,
              },
              {
                step: "03",
                title: "Learn live",
                desc: "Step into our browser-based live classroom with low-latency audio/video, real-time digital whiteboard, and problem-solving tools.",
                icon: Video,
              },
            ].map((st, idx) => (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-[#FAF9F5] border border-[#E5E4DE] hover:border-[#111111]/40 transition-all shadow-xs relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-black text-[#F26522] font-mono">{st.step}</span>
                    <div className="w-10 h-10 rounded-2xl bg-white border border-[#E5E4DE] flex items-center justify-center text-[#111111] shadow-2xs">
                      <st.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-[#111111]">{st.title}</h3>
                  <p className="text-xs text-[#111111]/70 leading-relaxed mt-2">{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. LIVE CLASSROOM SHOWCASE ─── */}
      <section className="py-20 sm:py-28 bg-[#111111] text-white relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#F26522]" />
                HUMAN-LED EDUCATION
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                A live classroom built for real teaching.
              </h2>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed">
                No simulated AI teachers. Every session is led by a verified human educator with real-time video, interactive drawing, screen sharing, and structured materials.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  { title: "Collaborative Whiteboard", desc: "Dual-cursor drawing with mathematical equation and shape tools." },
                  { title: "HD WebRTC Streaming", desc: "Crystal clear audio and video designed for low-bandwidth networks." },
                  { title: "Structured Coursework", desc: "Direct assignment distribution, student uploads, and annotated grading." },
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#F26522]/20 border border-[#F26522]/40 flex items-center justify-center text-[#F26522] shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{feat.title}</h4>
                      <p className="text-xs text-white/60 mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  onClick={() => navigate("/classroom/demo")}
                  className="px-6 py-3 rounded-full bg-[#F26522] hover:bg-[#d85518] text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Explore Demo Classroom
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-[#191919] rounded-3xl border border-white/15 p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-bold text-white">Live Session: HSC Physics Mechanics</span>
                  </div>
                  <span className="text-[11px] text-white/60 bg-white/10 px-2.5 py-0.5 rounded-full">
                    Latency: 32ms
                  </span>
                </div>

                <div className="bg-[#111111] rounded-2xl p-5 border border-white/10 aspect-video flex flex-col justify-between">
                  <div className="font-mono text-xs text-white/70 space-y-1">
                    <p className="text-[#F26522] font-bold">// Newton's Laws & Vector Resolution:</p>
                    <p className="text-white text-sm">F_net = m · a  |  ∑ F_x = T · cos(θ) - f_k</p>
                    <p className="text-emerald-400 text-[11px] pt-1">✓ Normal force balanced: N = m · g - T · sin(θ)</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-white/60">
                    <span>Teacher Annotation Active</span>
                    <span className="text-[#F26522] font-semibold">1080p Screen Sync</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. PERSONALIZED LEARNING SECTION ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <SectionLabel label="03" text="TAILORED CURRICULUM" />
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
                Education shaped around your goals.
              </h2>
              <p className="text-sm sm:text-base text-[#111111]/70 leading-relaxed">
                Every student learns differently. Virtual Tutor connects you with instructors who design custom milestone plans for Bangla Medium, English Version, Cambridge IGCSE, Edexcel, and University Entrance.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-[#E5E4DE] shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]/50">Curriculum Matching</h4>
                  <p className="text-sm font-bold text-[#111111] mt-1">Bangla & English Medium</p>
                  <p className="text-xs text-[#111111]/60 mt-0.5">Syllabus-aligned preparation</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#E5E4DE] shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]/50">Pacing</h4>
                  <p className="text-sm font-bold text-[#111111] mt-1">1-on-1 Focus</p>
                  <p className="text-xs text-[#111111]/60 mt-0.5">Learn at your speed</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white rounded-3xl border border-[#E5E4DE] p-7 shadow-xs space-y-5">
                <h3 className="text-base font-bold text-[#111111]">Sample Student Learning Plan</h3>
                <div className="space-y-3">
                  {[
                    { week: "Week 1-2", topic: "Vector Algebra & Kinematics", status: "Mastered" },
                    { week: "Week 3-4", topic: "Circular Motion & Gravitation", status: "In Progress" },
                    { week: "Week 5-6", topic: "Work, Energy & Power Review", status: "Scheduled" },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E5E4DE]">
                      <div>
                        <p className="text-xs font-bold text-[#111111]">{p.topic}</p>
                        <p className="text-[11px] text-[#111111]/60">{p.week}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === "Mastered"
                          ? "bg-emerald-100 text-emerald-800"
                          : p.status === "In Progress"
                          ? "bg-[#111111] text-white"
                          : "bg-white border border-[#E5E4DE] text-[#111111]/60"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. STUDENT PROGRESS SECTION ─── */}
      <section className="py-20 sm:py-28 bg-white border-y border-[#E5E4DE]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <SectionLabel label="04" text="ANALYTICS & PROGRESS TRACKING" className="justify-center" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111] mt-2">
              Track your authentic learning journey.
            </h2>
            <p className="text-sm text-[#111111]/70 mt-2">
              Every lesson session, study hour, and syllabus milestone is measured and displayed in your personalized student dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#FAF9F5] rounded-3xl p-6 border border-[#E5E4DE] shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#E5E4DE] flex items-center justify-center text-[#F26522] mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-lg font-bold text-[#111111]">Hour Logging</p>
              <p className="text-xs text-[#111111]/70 mt-1">Verified Classroom Time</p>
              <p className="text-[11px] text-[#111111]/50 mt-2 leading-relaxed">
                Precise per-session tracking inside the LiveKit WebRTC classroom with automatic attendance recording.
              </p>
            </div>

            <div className="bg-[#FAF9F5] rounded-3xl p-6 border border-[#E5E4DE] shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#E5E4DE] flex items-center justify-center text-[#111111] mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-lg font-bold text-[#111111]">Milestone Checkpoints</p>
              <p className="text-xs text-[#111111]/70 mt-1">Syllabus Breakdown</p>
              <p className="text-[11px] text-[#111111]/50 mt-2 leading-relaxed">
                Track topic-by-topic comprehension across NCTB, Cambridge, Edexcel, and test preparation curricula.
              </p>
            </div>

            <div className="bg-[#FAF9F5] rounded-3xl p-6 border border-[#E5E4DE] shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#E5E4DE] flex items-center justify-center text-[#F26522] mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-lg font-bold text-[#111111]">Study Momentum</p>
              <p className="text-xs text-[#111111]/70 mt-1">Weekly Consistency</p>
              <p className="text-[11px] text-[#111111]/50 mt-2 leading-relaxed">
                Visual streak badges and schedule reminders encourage disciplined weekly academic routines.
              </p>
            </div>

            <div className="bg-[#FAF9F5] rounded-3xl p-6 border border-[#E5E4DE] shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#E5E4DE] flex items-center justify-center text-[#111111] mb-4">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-lg font-bold text-[#111111]">Teacher Feedback</p>
              <p className="text-xs text-[#111111]/70 mt-1">Performance Reviews</p>
              <p className="text-[11px] text-[#111111]/50 mt-2 leading-relaxed">
                Receive direct notes, homework critique, and performance evaluations from your personal tutor after every lesson.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. FOR TEACHERS SECTION ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="bg-[#111111] rounded-3xl p-8 sm:p-14 text-white border border-[#111111] shadow-xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-8 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider text-[#F26522]">
                  TEACH ON VIRTUAL TUTOR
                </span>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
                  Keep 85% of your earnings.
                  <br />
                  Teach on your own schedule.
                </h2>
                <p className="text-sm sm:text-base text-white/70 max-w-2xl leading-relaxed">
                  Join Bangladesh's premier verified tutoring network. Set your own tuition fees, conduct classes in our WebRTC live classroom, and receive guaranteed month-end payouts.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => navigate("/teacher-application")}
                    className="px-7 py-3.5 rounded-full bg-[#F26522] hover:bg-[#d85518] text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Apply as a Teacher
                  </button>
                  <span className="text-xs text-white/50">Zero upfront platform fees</span>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white/5 rounded-2xl p-6 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">Educator Benefits</h4>
                <div className="space-y-2 text-xs text-white/80">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#F26522]" /> 85% Net Payout Allocation
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#F26522]" /> Direct Student Discovery
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#F26522]" /> Integrated Classroom & Calendar
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#F26522]" /> Automated Month-End Settlement
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 10. SECURE PAYMENT SECTION ─── */}
      <section className="py-20 sm:py-28 bg-white border-y border-[#E5E4DE]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <SectionLabel label="05" text="FINANCIAL INTEGRITY" />
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
                Protected tuition payments.
              </h2>
              <p className="text-sm text-[#111111]/70 leading-relaxed">
                Pay safely using Bangladesh’s leading mobile financial services and bank cards. Student tuition is held in escrow and released to educators only after classes are completed.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  "Official automated checkout via Virtual Tutor Gateway (Paymently)",
                  "Instant payment verification with bKash, Nagad, Rocket, Upay & Cards",
                  "100% money-back protection if a scheduled class is missed or cancelled",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-[#111111] font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <a
                  href="https://vartualtutor.paymently.io/paymentlink/default/BDT"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold shadow-sm transition-all"
                >
                  <span>Open Official Payment Gateway</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#FAF9F5] rounded-3xl p-7 border border-[#E5E4DE] shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]/50">Official Merchant Portal</h4>
                  <p className="text-xs font-mono font-bold text-[#111111] mt-0.5">vartualtutor.paymently.io</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active BDT Gateway
                </span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#E5E4DE]">
                <img
                  src="/payment-link-BDT-qr.svg"
                  alt="Virtual Tutor Paymently QR Code"
                  className="w-20 h-20 rounded-lg object-contain shrink-0 border border-[#E5E4DE] p-1"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#111111] block">Scan & Pay via MFS QR</span>
                  <p className="text-[11px] text-[#111111]/60 leading-tight">
                    Scan with bKash, Nagad, or Upay app from anywhere for instant zero-fee tuition settlement.
                  </p>
                  <a
                    href="https://vartualtutor.paymently.io/paymentlink/default/BDT"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-[#F26522] hover:underline inline-flex items-center gap-1 pt-0.5"
                  >
                    <span>vartualtutor.paymently.io/paymentlink/default/BDT</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/50 block">Supported Channels</span>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#D12053] text-white shadow-2xs">bKash</span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#F7941D] text-white shadow-2xs">Nagad</span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#8C3494] text-white shadow-2xs">Rocket</span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#2E3192] text-white shadow-2xs">Upay</span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#111111] text-white shadow-2xs">Visa / Mastercard</span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E5E4DE] text-[#111111]">Internet Banking</span>
                </div>
              </div>

              <p className="text-[11px] text-[#111111]/60 pt-2 border-t border-[#E5E4DE]">
                All transactions are encrypted with 256-bit SSL banking standards and Bangladesh Bank regulatory protocols.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 11. FAQ ACCORDION SECTION ─── */}
      <section id="faq" className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <SectionLabel label="06" text="FREQUENTLY ASKED QUESTIONS" className="justify-center" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111] mt-2">
              Everything you need to know.
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "How are teachers verified on Virtual Tutor?",
                a: "Every educator completes an 8-step application verifying their National ID, educational credentials, subject expertise, and online teaching readiness before being approved.",
              },
              {
                q: "What equipment do I need for live classes?",
                a: "A desktop, laptop, or tablet with a working microphone and camera. Our live classroom operates directly inside Google Chrome, Edge, and Safari with zero software installation required.",
              },
              {
                q: "How does payment protection work?",
                a: "Tuition is securely held when booking. Teachers receive their 85% payout share at month-end based on delivered classes. If a tutor cancels or misses a session, you are refunded or rescheduled.",
              },
              {
                q: "Can I choose my own schedule and lesson duration?",
                a: "Yes. Tutors specify their available weekly slots, and students can book 30-minute consultations, 60-minute standard lessons, or monthly continuous plans.",
              },
            ].map((faq, idx) => {
              const isOpen = activeFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-[#E5E4DE] overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-sm font-bold text-[#111111]">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#111111]/50 transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180 text-[#F26522]" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-5 pb-5 text-xs sm:text-sm text-[#111111]/70 leading-relaxed border-t border-[#E5E4DE]/60 pt-3"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 12. FINAL CTA SECTION ─── */}
      <section className="py-20 sm:py-28 bg-[#111111] text-white text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Your next great lesson starts here.
          </h2>
          <p className="text-sm sm:text-base text-white/70 max-w-xl mx-auto leading-relaxed">
            Join thousands of motivated students and certified educators on Bangladesh's premier live tutoring platform.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate("/teachers")}
              className="px-8 py-4 rounded-full bg-[#F26522] hover:bg-[#d85518] text-white font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              Find a Tutor
            </button>
          </div>
        </div>
      </section>

      {/* ─── 13. FOUR-COLUMN PROFESSIONAL FOOTER ─── */}
      <footer className="bg-white border-t border-[#E5E4DE] py-16 text-xs text-[#111111]/70">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Column 1: Virtual Tutor */}
            <div className="space-y-3">
              <p className="font-bold text-[#111111] text-sm uppercase tracking-wider">Virtual Tutor</p>
              <p className="text-xs text-[#111111]/60 leading-relaxed">
                A trusted online learning platform connecting students with verified teachers across Bangladesh and beyond.
              </p>
              <div className="pt-1">
                <Link to="/teachers" className="block py-1 hover:text-[#111111] font-medium">Find Tutors</Link>
                <Link to="/teacher-application" className="block py-1 hover:text-[#111111] font-medium">Become a Tutor</Link>
              </div>
            </div>

            {/* Column 2: Learning */}
            <div className="space-y-2">
              <p className="font-bold text-[#111111] text-sm uppercase tracking-wider">Learning</p>
              <Link to="/lessons" className="block py-1 hover:text-[#111111] font-medium">Lessons</Link>
              <Link to="/assignments" className="block py-1 hover:text-[#111111] font-medium">Assignments</Link>
              <Link to="/progress" className="block py-1 hover:text-[#111111] font-medium">Progress</Link>
              <Link to="/community" className="block py-1 hover:text-[#111111] font-medium">Community</Link>
            </div>

            {/* Column 3: Support */}
            <div className="space-y-2">
              <p className="font-bold text-[#111111] text-sm uppercase tracking-wider">Support</p>
              <Link to="/faq" className="block py-1 hover:text-[#111111] font-medium">FAQ</Link>
              <Link to="/contact" className="block py-1 hover:text-[#111111] font-medium">Contact Support</Link>
              <Link to="/students" className="block py-1 hover:text-[#111111] font-medium">Student Learning Requests</Link>
            </div>

            {/* Column 4: Legal */}
            <div className="space-y-2">
              <p className="font-bold text-[#111111] text-sm uppercase tracking-wider">Legal</p>
              <Link to="/privacy" className="block py-1 hover:text-[#111111] font-medium">Privacy Policy</Link>
              <Link to="/terms" className="block py-1 hover:text-[#111111] font-medium">Terms of Service</Link>
              <Link to="/privacy" className="block py-1 hover:text-[#111111] font-medium">Refund Policy</Link>
            </div>
          </div>

          <div className="pt-8 border-t border-[#E5E4DE] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#111111]/50">
            <p>© {new Date().getFullYear()} Virtual Tutor Pro. All rights reserved.</p>
            <p>Built for serious, high-quality human education.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
