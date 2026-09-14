import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
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
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  TutorCard,
  Floating3DObjects,
  HeroSearchPanel,
  CinematicBackgroundAnimation,
  GlobalScrollProgress,
  MouseSpotlight,
  CursorEnhancement,
  FloatingNavPill,
} from "@/components/redesign";
import { useNumberCounter } from "@/hooks/use-number-counter";
import {
  ShieldCheck,
  Video,
  BookOpen,
  Calendar,
  CheckCircle2,
  Sparkles,
  Search,
  GraduationCap,
  Clock,
  Menu,
  X,
  PenTool,
  ArrowRight,
  Lock,
  Wallet,
  ChevronDown,
  Award,
  Check,
  TrendingUp,
  ExternalLink,
  Atom,
  Binary,
  Calculator,
  Languages,
} from "lucide-react";

// Subtle ambient particle canvas with Royal Violet and Mint Teal accents
function AmbientAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particleCount = 28;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.15 - Math.random() * 0.2,
      radius: 1.2 + Math.random() * 2,
      alpha: 0.15 + Math.random() * 0.25,
      hue: Math.random() > 0.5 ? 245 : 175, // Royal Violet (245) & Mint Teal (175)
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
        ctx.fillStyle = `hsla(${p.hue}, 85%, 60%, ${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsla(${p.hue}, 85%, 60%, 0.35)`;
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
          opacity: [0.35, 0.55, 0.35],
          x: [0, 20, 0],
          y: [0, -15, 0],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 left-1/4 w-[34rem] h-[34rem] rounded-full bg-radial from-[#6D5DFB]/18 via-[#312E81]/10 to-transparent blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.1, 0.95, 1.1],
          opacity: [0.25, 0.45, 0.25],
          x: [0, -25, 0],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-1/3 right-1/4 w-[36rem] h-[36rem] rounded-full bg-radial from-[#14B8A6]/14 via-[#6D5DFB]/8 to-transparent blur-3xl"
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
          className="w-1 bg-[#14B8A6] rounded-full"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

// Animated Counter Helper for authoritative numbers
function AnimatedStatCounter({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const { value: currentVal, ref } = useNumberCounter(value, { duration: 1200 });
  return (
    <span ref={ref as any}>
      {prefix}
      {currentVal.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");

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
    "Physics",
    "Higher Math",
    "Chemistry",
    "Biology",
    "Bangla",
    "English",
    "ICT",
  ];

  // Filter teachers by search query and subject
  const filteredTeachers = useMemo(() => {
    return teachers
      .filter((t) => {
        const matchesSubject =
          selectedSubject === "All" ||
          t.subjects?.some((s) => s.toLowerCase().includes(selectedSubject.toLowerCase()));
        const matchesSearch =
          !searchQuery.trim() ||
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subjects?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
          t.title?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSubject && matchesSearch;
      })
      .slice(0, 6);
  }, [teachers, selectedSubject, searchQuery]);

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
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-[#6D5DFB]/25 selection:text-[#C7D2FE] relative overflow-x-clip">
      {/* ─── Plane 0: Continuous Cinematic Background Foundation (Agent Wave) ─── */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <CinematicBackgroundAnimation
          variant="hero-dark"
          theme="dark"
          opacity={0.96}
          showGrain={true}
        />
        {/* Minimal atmospheric vignette for crisp text contrast without muting the wave */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/60 pointer-events-none" />
      </div>

      {/* Plane 1: Atmospheric Canvas Particles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <AmbientAtmosphere />
      </div>
      <GlobalScrollProgress />
      <MouseSpotlight />
      <CursorEnhancement />

      {/* ─── 1. GLOBAL FLOATING GLASS HEADER ─── */}
      <header className="fixed top-4 inset-x-0 z-50 transition-all duration-300 px-4 sm:px-6 max-w-[1280px] mx-auto">
        <div
          className={`w-full rounded-2xl sm:rounded-full px-4 sm:px-6 py-3 flex items-center justify-between transition-all duration-300 ${
            isScrolled
              ? "bg-[#07142F]/80 backdrop-blur-2xl border border-white/14 shadow-[0_12px_36px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)]"
              : "bg-[#07142F]/55 backdrop-blur-xl border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]"
          }`}
        >
          {/* Logo */}
          <div className="flex items-center">
            <BrandLogo
              variant="horizontal"
              size="md"
              showSubtext={true}
              isDark={true}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="cursor-pointer"
            />
          </div>

          {/* Desktop Navigation Links with Liquid Surface Pill */}
          <FloatingNavPill
            items={[
              { label: "Find Tutors", href: "/teachers" },
              { label: "How It Works", href: "#how-it-works", isExternalOrHash: true },
              { label: "Subjects", href: "#subjects", isExternalOrHash: true },
              { label: "Become a Tutor", href: "/teacher-application" },
              { label: "Community", href: "/community" },
              { label: "FAQ", href: "#faq", isExternalOrHash: true },
            ]}
            isDark={true}
            isScrolled={isScrolled}
          />

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <PrimaryButton onClick={() => navigate("/dashboard")} size="sm">
                Dashboard
              </PrimaryButton>
            ) : (
              <>
                <GhostButton
                  onClick={() => navigate("/auth?mode=login")}
                  size="sm"
                  className="text-[#B8C5E0] hover:text-[#F8FAFF] hover:bg-white/10"
                >
                  Log In
                </GhostButton>
                <PrimaryButton
                  onClick={() => navigate("/auth?mode=signup")}
                  size="sm"
                >
                  Start Learning
                </PrimaryButton>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-white hover:bg-white/10 transition-colors cursor-pointer"
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
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="md:hidden mt-2 border border-white/15 bg-slate-950/90 backdrop-blur-2xl px-5 pt-4 pb-6 space-y-3 rounded-3xl overflow-hidden shadow-2xl"
            >
              <Link
                to="/teachers"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-200 hover:text-white"
              >
                Find Tutors
              </Link>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-200 hover:text-white"
              >
                How It Works
              </a>
              <a
                href="#subjects"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-200 hover:text-white"
              >
                Subjects
              </a>
              <Link
                to="/teacher-application"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-200 hover:text-white"
              >
                Become a Tutor
              </Link>
              <Link
                to="/community"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-200 hover:text-white"
              >
                Community
              </Link>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-200 hover:text-white"
              >
                FAQ
              </a>
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                {isAuthenticated ? (
                  <PrimaryButton
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/dashboard");
                    }}
                    className="w-full justify-center"
                  >
                    Go to Dashboard
                  </PrimaryButton>
                ) : (
                  <>
                    <SecondaryButton
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/auth?mode=login");
                      }}
                      className="w-full justify-center bg-white/10 text-white border-white/20 hover:bg-white/20"
                    >
                      Log In
                    </SecondaryButton>
                    <PrimaryButton
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/auth?mode=signup");
                      }}
                      className="w-full justify-center bg-white text-slate-950 hover:bg-slate-100 font-bold"
                    >
                      Start Learning
                    </PrimaryButton>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 overflow-hidden z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-6 space-y-6 text-left"
            >
              {/* Eyebrow Pill Row */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/14 bg-white/[0.06] backdrop-blur-md shadow-[0_0_20px_rgba(65,105,225,0.2)] text-xs font-bold tracking-wider uppercase text-[#F8FAFF]">
                  <span className="w-2 h-2 rounded-full bg-[#4169E1] animate-pulse" />
                  VERIFIED 1-ON-1 ONLINE LEARNING · BANGLADESH
                </span>
              </div>

              {/* Main Headline with Blur-to-Sharp Choreography & Manrope Scale */}
              <motion.div variants={itemVariants}>
                <h1 className="text-[34px] sm:text-[46px] lg:text-[58px] xl:text-[66px] font-extrabold tracking-[-0.035em] leading-[1.03] text-[#F8FAFF]">
                  <motion.span
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                    className="block text-glow-hero"
                  >
                    Learn better.
                  </motion.span>
                  <motion.span
                    initial={shouldReduceMotion ? {} : { opacity: 0.1, filter: "blur(6px)", y: 15 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
                    className="block bg-gradient-to-r from-white via-[#8EA7FF] to-[#5B7CFF] bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(65,105,225,0.35)]"
                  >
                    With the right teacher.
                  </motion.span>
                </h1>
              </motion.div>

              {/* Supporting Text */}
              <motion.div variants={itemVariants}>
                <p className="text-[17px] sm:text-[18.5px] leading-[1.6] max-w-xl text-[#B8C5E0] drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
                  Connect with verified teachers, book live one-to-one lessons, and learn in a professional WebRTC classroom with real-time digital whiteboard and protected escrow payments.
                </p>
              </motion.div>

              {/* CTAs */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3.5 pt-1">
                <PrimaryButton
                  onClick={() => navigate("/teachers")}
                  size="lg"
                >
                  Find a Tutor
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => navigate("/teacher-application")}
                  size="lg"
                >
                  Become a Tutor
                </SecondaryButton>
              </motion.div>

              {/* Quick Trust Highlights */}
              <motion.div
                variants={itemVariants}
                className="pt-6 border-t border-white/15 grid grid-cols-3 gap-4"
              >
                <div>
                  <p className="text-2xl font-black text-white">
                    <AnimatedStatCounter value={100} suffix="%" />
                  </p>
                  <p className="text-xs font-medium text-slate-300 mt-0.5">Verified Teachers</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[#C7D2FE]">1-on-1</p>
                  <p className="text-xs font-medium text-slate-300 mt-0.5">Interactive Live Video</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[#2DD4BF]">Escrow</p>
                  <p className="text-xs font-medium text-slate-300 mt-0.5">Payment Protection</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Visual Composition with 3D Mouse Parallax */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              style={{ rotateX: heroCardRotateX, rotateY: heroCardRotateY }}
              className="lg:col-span-6 relative perspective-[1000px]"
            >
              {/* Floating Verified Badge */}
              <motion.div
                style={{ x: heroBadgeParallaxX, y: heroBadgeParallaxY }}
                className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/20 shadow-[0_16px_36px_rgba(0,0,0,0.4)] absolute -top-5 -left-5 z-20"
              >
                <div className="w-8 h-8 rounded-xl bg-[#14B8A6]/20 text-[#2DD4BF] border border-[#14B8A6]/40 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Verified Faculty</p>
                  <p className="text-[10px] text-slate-300">BUET · DU · DMC · IBA Screened</p>
                </div>
              </motion.div>

              {/* Main Classroom Studio Frosted Glass Card */}
              <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/15 text-white shadow-[0_24px_64px_rgba(0,0,0,0.5)] relative overflow-hidden">
                {/* Top Studio Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6] animate-pulse" />
                    <span className="text-xs font-bold tracking-wide">Live Classroom #842</span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/80 border border-white/10">
                      WebRTC Low Latency
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LiveWaveform />
                    <span className="text-xs text-white/70 font-mono">42:15</span>
                  </div>
                </div>

                {/* Whiteboard Interactive Canvas Preview */}
                <div className="my-5 p-5 bg-[#0B0F19]/80 rounded-2xl border border-white/10 relative overflow-hidden aspect-video flex flex-col justify-between backdrop-blur-sm">
                  <div className="space-y-1 relative z-10 font-mono text-xs text-white/80">
                    <p className="text-[#A5B4FC] font-bold">// HSC Higher Mathematics · Calculus:</p>
                    <p className="text-white text-sm font-semibold">∫ (3x² + 4x - 5) dx = x³ + 2x² - 5x + C</p>
                    <p className="text-[#2DD4BF] text-[11px] pt-1">✓ Step verified: d/dx(x³ + 2x² - 5x + C) = 3x² + 4x - 5</p>
                  </div>

                  {/* Animated SVG trajectory drawing the integral curve */}
                  <motion.div
                    animate={{
                      x: [0, 50, 25, 75, 0],
                      y: [0, 12, -6, 8, 0],
                    }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-10 right-10 w-36 h-20 pointer-events-none opacity-40"
                  >
                    <svg viewBox="0 0 100 50" className="w-full h-full stroke-[#6D5DFB] fill-none stroke-2">
                      <motion.path
                        d="M 10,25 Q 50,5 90,25 T 100,45"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </svg>
                  </motion.div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-white/70 relative z-10">
                    <span className="flex items-center gap-1.5 text-white/90">
                      <PenTool className="w-3.5 h-3.5 text-[#2DD4BF]" /> Tutor Cursor: Active Annotation
                    </span>
                    <span className="text-[#A5B4FC] font-semibold">Real-Time Sync</span>
                  </div>
                </div>

                {/* Bottom Participant Strip */}
                <div className="flex items-center justify-between pt-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#312E81] to-[#6D5DFB] text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/20">
                      TR
                    </div>
                    <div>
                      <p className="font-bold text-white leading-tight">Tanvir Rahman</p>
                      <p className="text-[10px] text-slate-300">Physics Specialist (BUET)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/classroom/demo")}
                    className="px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors cursor-pointer border border-white/15"
                  >
                    Enter Live Preview
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Hero Search Panel (Embedded directly below hero grid) */}
          <div className="mt-12 sm:mt-16">
            <HeroSearchPanel isDark={true} />
          </div>
        </div>
      </section>

      {/* ─── 3. TRUST SIGNALS SECTION ─── */}
      <section className="py-12 border-y border-white/10 bg-white/[0.02] backdrop-blur-md relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
            {[
              {
                icon: ShieldCheck,
                title: "Verified Teachers",
                desc: "Academic credentials & NID screened",
              },
              {
                icon: Lock,
                title: "Secure Payments",
                desc: "Tuition escrow via Paymently BDT",
              },
              {
                icon: Video,
                title: "Live Classroom",
                desc: "WebRTC low latency & whiteboard",
              },
              {
                icon: Sparkles,
                title: "Personalized Study",
                desc: "Tailored to NCTB & Cambridge",
              },
              {
                icon: TrendingUp,
                title: "Progress Tracking",
                desc: "Syllabus checkpoints & reviews",
              },
            ].map((pillar, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.07] border border-white/15 flex items-center justify-center text-[#5B7CFF] shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
                  <pillar.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">{pillar.title}</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. FIND YOUR TEACHER SECTION ─── */}
      <section id="find-tutors" className="py-20 sm:py-28 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <SectionLabel label="01" text="QUALIFIED INSTRUCTORS" theme="dark" />
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
                Find your dedicated teacher.
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Browse verified educators with proven track records across National Curriculum, English Medium, and Admissions.
              </p>
            </div>
            <button
              onClick={() => navigate("/teachers")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8EA7FF] hover:text-white transition-colors self-start md:self-auto cursor-pointer"
            >
              <span>View all teachers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="glass-panel rounded-3xl p-4 sm:p-5 mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teachers or subjects (e.g. Physics, Higher Math, Chemistry, English)..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D5DFB]/40 focus:border-[#6D5DFB] transition-all"
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
                      ? "bg-gradient-to-r from-[#6D5DFB] to-[#5B4BE8] text-white shadow-[0_4px_16px_rgba(109,93,251,0.4)] border border-white/30"
                      : "bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.12] border border-white/10"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Real Authoritative Tutor Grid */}
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
                    theme="dark"
                    onBook={() => navigate(`/teachers/${tutor.userId || tutor._id}`)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16 glass-panel rounded-3xl p-8">
              <GraduationCap className="w-12 h-12 text-[#A5B4FC] mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No teachers match your search</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                Try adjusting your search query or subject filters to find available tutors.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSubject("All");
                }}
                className="mt-4 px-5 py-2 rounded-full bg-[#6D5DFB] text-white text-xs font-bold hover:bg-[#5B4BE8] transition-colors cursor-pointer shadow-md"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── 5. HOW IT WORKS SECTION ─── */}
      <section id="how-it-works" className="py-20 sm:py-28 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <SectionLabel label="02" text="SIMPLE THREE-STEP PROCESS" className="justify-center" theme="dark" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              How Virtual Tutor works
            </h2>
            <p className="text-sm text-slate-300 mt-2">
              From finding the ideal educator to learning live on our interactive whiteboard in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting progression line on desktop */}
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-[2px] -translate-y-14 z-0 pointer-events-none" aria-hidden="true">
              <div className="w-full h-full bg-gradient-to-r from-[#4169E1]/40 via-[#5B7CFF]/50 to-[#4169E1]/40 rounded-full" />
            </div>

            {[
              {
                step: "01",
                title: "Find your teacher",
                desc: "Filter by subject, grade level, curriculum, and budget. Review transparent verified ratings, degrees, and teaching experience.",
                icon: Search,
              },
              {
                step: "02",
                title: "Book your lesson",
                desc: "Choose a time slot that matches your schedule. Confirm your booking with zero hassle through automated Paymently escrow.",
                icon: Calendar,
              },
              {
                step: "03",
                title: "Learn live",
                desc: "Step into our browser-based live classroom with low-latency audio/video, real-time digital whiteboard, and problem-solving tools.",
                icon: Video,
              },
            ].map((st, idx) => (
              <motion.div
                key={idx}
                whileHover={shouldReduceMotion ? {} : { y: -6 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                data-interactive="true"
                className="group p-8 rounded-3xl glass-panel glass-panel-hover relative flex flex-col justify-between overflow-hidden z-10"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#8EA7FF] to-[#4169E1] font-mono transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_8px_rgba(65,105,225,0.4)]">
                      {st.step}
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-[#5B7CFF] shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-transform duration-300 group-hover:rotate-6">
                      <st.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#8EA7FF] transition-colors">{st.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed mt-2">{st.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. POPULAR SUBJECTS SECTION (8 VISUAL TILES) ─── */}
      <section id="subjects" className="py-20 sm:py-28 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <SectionLabel label="03" text="EXPLORE SUBJECTS" theme="dark" />
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
                Top subjects taught by verified experts.
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Select your focus subject to explore qualified university instructors and syllabus-aligned courses.
              </p>
            </div>
            <button
              onClick={() => navigate("/teachers")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8EA7FF] hover:text-white transition-colors self-start md:self-auto cursor-pointer"
            >
              <span>Explore all subjects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                title: "Physics Mechanics & Waves",
                short: "Physics",
                grade: "SSC · HSC · O/A Level",
                icon: Atom,
                color: "text-[#A5B4FC] bg-[#312E81]/30",
              },
              {
                title: "Higher Mathematics & Calculus",
                short: "Higher Math",
                grade: "Algebra · Calculus · Vectors",
                icon: Calculator,
                color: "text-[#C7D2FE] bg-[#6D5DFB]/30",
              },
              {
                title: "Organic & Inorganic Chemistry",
                short: "Chemistry",
                grade: "SSC · HSC · Cambridge",
                icon: Sparkles,
                color: "text-[#2DD4BF] bg-[#14B8A6]/30",
              },
              {
                title: "Biology & Life Sciences",
                short: "Biology",
                grade: "Zoology · Botany · Medical Prep",
                icon: BookOpen,
                color: "text-emerald-400 bg-emerald-500/20",
              },
              {
                title: "English Grammar & Literature",
                short: "English",
                grade: "IELTS · Edexcel · Spoken English",
                icon: Languages,
                color: "text-amber-400 bg-amber-500/20",
              },
              {
                title: "Bangla Language & Sahitya",
                short: "Bangla",
                grade: "NCTB Board 1st & 2nd Paper",
                icon: PenTool,
                color: "text-rose-400 bg-rose-500/20",
              },
              {
                title: "ICT & Computer Programming",
                short: "ICT",
                grade: "C · Python · Web · Database",
                icon: Binary,
                color: "text-indigo-400 bg-indigo-500/20",
              },
              {
                title: "University Admission Prep",
                short: "Admission",
                grade: "BUET · Medical · DU A-Unit",
                icon: GraduationCap,
                color: "text-blue-400 bg-blue-500/20",
              },
            ].map((sub, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/teachers?subject=${encodeURIComponent(sub.short)}`)}
                className="p-6 rounded-3xl glass-panel glass-panel-hover transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-2xl ${sub.color} border border-white/10 flex items-center justify-center`}>
                      <sub.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition-colors flex items-center gap-1">
                      Browse <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#C7D2FE] transition-colors">
                    {sub.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{sub.grade}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. LIVE CLASSROOM SHOWCASE ─── */}
      <section className="py-20 sm:py-28 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#4169E1]" />
                HUMAN-LED LIVE EDUCATION
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                A live classroom built for real teaching.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                No simulated AI recordings. Every session is led by a verified human educator with real-time video, interactive digital drawing, screen sharing, and syllabus-structured materials.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  { title: "Collaborative Whiteboard", desc: "Dual-cursor drawing with mathematical formulas and geometric shape tools." },
                  { title: "HD WebRTC Streaming", desc: "Low-latency crystal clear audio and video designed for local internet connections." },
                  { title: "Structured Coursework", desc: "Direct assignment distribution, student uploads, and annotated homework grading." },
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#4169E1]/20 border border-[#4169E1]/40 flex items-center justify-center text-[#8EA7FF] shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{feat.title}</h4>
                      <p className="text-xs text-slate-300 mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  onClick={() => navigate("/classroom/demo")}
                  className="px-6 py-3 rounded-full bg-[#4169E1] hover:bg-[#5B7CFF] text-white font-bold text-xs transition-all shadow-[0_4px_20px_rgba(65,105,225,0.32)] border border-[#5B7CFF]/30 cursor-pointer"
                >
                  Explore Demo Classroom
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="glass-dock rounded-3xl p-6 shadow-2xl space-y-4 border border-white/15">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4169E1] animate-ping" />
                    <span className="font-bold text-white">Live Session: HSC Physics Mechanics</span>
                  </div>
                  <span className="text-[11px] text-white/80 bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-full">
                    Latency: 32ms
                  </span>
                </div>

                <div className="bg-[#0B0F19]/85 rounded-2xl p-5 border border-white/10 aspect-video flex flex-col justify-between backdrop-blur-md">
                  <div className="font-mono text-xs text-white/80 space-y-1">
                    <p className="text-[#8EA7FF] font-bold">// Newton's Laws & Vector Resolution:</p>
                    <p className="text-white text-sm">F_net = m · a  |  ∑ F_x = T · cos(θ) - f_k</p>
                    <p className="text-[#5B7CFF] text-[11px] pt-1">✓ Normal force balanced: N = m · g - T · sin(θ)</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-white/70">
                    <span>Teacher Annotation Active</span>
                    <span className="text-[#8EA7FF] font-semibold">1080p Screen Sync</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. PERSONALIZED LEARNING ROADMAP ─── */}
      <section className="py-20 sm:py-28 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <SectionLabel label="04" text="TAILORED ROADMAP" theme="dark" />
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Education shaped around your syllabus.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Every student learns differently. Virtual Tutor connects you with instructors who design custom milestone plans for Bangla Medium, English Version, Cambridge IGCSE, Edexcel, and University Entrance.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl glass-panel border border-white/12">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Curriculum Matching</h4>
                  <p className="text-sm font-bold text-white mt-1">Bangla & English Medium</p>
                  <p className="text-xs text-slate-300 mt-0.5">Syllabus-aligned preparation</p>
                </div>
                <div className="p-4 rounded-2xl glass-panel border border-white/12">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pacing</h4>
                  <p className="text-sm font-bold text-white mt-1">1-on-1 Focus</p>
                  <p className="text-xs text-slate-300 mt-0.5">Learn at your speed</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="glass-panel rounded-3xl p-7 border border-white/15 space-y-5">
                <h3 className="text-base font-bold text-white">Sample Student Learning Plan</h3>
                <div className="space-y-3">
                  {[
                    { week: "Week 1-2", topic: "Vector Algebra & Kinematics", status: "Mastered" },
                    { week: "Week 3-4", topic: "Circular Motion & Gravitation", status: "In Progress" },
                    { week: "Week 5-6", topic: "Work, Energy & Power Review", status: "Scheduled" },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 bg-white/[0.05] hover:bg-white/[0.08] rounded-2xl border border-white/10 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-white">{p.topic}</p>
                        <p className="text-[11px] text-slate-300">{p.week}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        p.status === "Mastered"
                          ? "bg-teal-500/20 text-[#2DD4BF] border-teal-500/30"
                          : p.status === "In Progress"
                          ? "bg-[#4169E1]/30 text-[#8EA7FF] border-[#4169E1]/40"
                          : "bg-white/[0.08] border-white/15 text-slate-400"
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

      {/* ─── 9. STUDENT PROGRESS & ANALYTICS ─── */}
      <section className="py-20 sm:py-28 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <SectionLabel label="05" text="ACADEMIC TRACKING" className="justify-center" theme="dark" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              Track your authentic learning journey.
            </h2>
            <p className="text-sm text-slate-300 mt-2">
              Every lesson session, study hour, and syllabus milestone is measured and displayed in your personalized student dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel glass-panel-hover rounded-3xl p-6 border border-white/15">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-[#8EA7FF] mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-lg font-bold text-white">Hour Logging</p>
              <p className="text-xs text-[#5B7CFF] font-semibold mt-1">Verified Classroom Time</p>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                Precise per-session tracking inside the WebRTC classroom with automatic attendance recording.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover rounded-3xl p-6 border border-white/15">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-[#8EA7FF] mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-lg font-bold text-white">Milestones</p>
              <p className="text-xs text-[#5B7CFF] font-semibold mt-1">Syllabus Breakdown</p>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                Track topic-by-topic comprehension across NCTB, Cambridge, Edexcel, and test preparation curricula.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover rounded-3xl p-6 border border-white/15">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-[#5B7CFF] mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-lg font-bold text-white">Study Momentum</p>
              <p className="text-xs text-[#5B7CFF] font-semibold mt-1">Weekly Consistency</p>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                Visual streak badges and schedule reminders encourage disciplined weekly academic routines.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover rounded-3xl p-6 border border-white/15">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-[#8EA7FF] mb-4">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-lg font-bold text-white">Teacher Notes</p>
              <p className="text-xs text-[#5B7CFF] font-semibold mt-1">Performance Reviews</p>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                Receive direct notes, homework critique, and performance evaluations from your personal tutor after every lesson.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 10. FOR TEACHERS SECTION ─── */}
      <section className="py-20 sm:py-28 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-dock rounded-3xl p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden border border-white/20">
            {/* Subtle atmospheric educator ambient light */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#4169E1]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#5B7CFF]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-8 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-wider text-[#8EA7FF] backdrop-blur-md">
                  TEACH ON VIRTUAL TUTOR
                </span>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
                  Keep 85% of your earnings.
                  <br />
                  Teach on your own schedule.
                </h2>
                <p className="text-sm sm:text-base text-slate-200 max-w-2xl leading-relaxed">
                  Join Bangladesh's premier verified tutoring network. Set your own tuition fees, conduct classes in our WebRTC live classroom, and receive guaranteed month-end payouts.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => navigate("/teacher-application")}
                    className="px-7 py-3.5 rounded-full bg-[#4169E1] hover:bg-[#5B7CFF] text-white font-bold text-xs transition-all shadow-[0_6px_25px_rgba(65,105,225,0.35)] border border-white/20 active:scale-95 cursor-pointer"
                  >
                    Apply as a Teacher
                  </button>
                  <span className="text-xs text-slate-300">Zero upfront platform fees</span>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white/[0.08] rounded-2xl p-6 border border-white/15 space-y-3 backdrop-blur-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Educator Benefits</h4>
                <div className="space-y-2 text-xs text-white">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#5B7CFF]" /> 85% Net Payout Allocation
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#5B7CFF]" /> Direct Student Discovery
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#5B7CFF]" /> Integrated Classroom & Calendar
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#5B7CFF]" /> Automated Month-End Settlement
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 11. SECURE PAYMENT SECTION ─── */}
      <section className="py-20 sm:py-28 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <SectionLabel label="06" text="FINANCIAL INTEGRITY" theme="dark" />
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Protected tuition payments.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Pay safely using Bangladesh’s leading mobile financial services and bank cards. Student tuition is held in escrow and released to educators only after classes are completed.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  "Official automated checkout via Virtual Tutor Gateway (Paymently)",
                  "Instant payment verification with bKash, Nagad, Rocket, Upay & Cards",
                  "100% money-back protection if a scheduled class is missed or cancelled",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-white font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <a
                  href="https://vartualtutor.paymently.io/paymentlink/default/BDT"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4169E1] hover:bg-[#5B7CFF] text-white text-xs font-bold shadow-[0_4px_20px_rgba(65,105,225,0.32)] border border-[#5B7CFF]/30 transition-all"
                >
                  <span>Open Official Payment Gateway</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-6 glass-panel rounded-3xl p-7 border border-white/15 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Official Merchant Portal</h4>
                  <p className="text-xs font-mono font-bold text-white mt-0.5">vartualtutor.paymently.io</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#4169E1]/20 text-[#8EA7FF] border border-[#4169E1]/30">
                  Active BDT Gateway
                </span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-white/95 rounded-2xl border border-white/20 text-slate-900">
                <img
                  src="/payment-link-BDT-qr.svg"
                  alt="Virtual Tutor Paymently QR Code"
                  className="w-20 h-20 rounded-lg object-contain shrink-0 border border-slate-200 p-1"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#0F172A] block">Scan & Pay via MFS QR</span>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Scan with bKash, Nagad, or Upay app from anywhere for instant zero-fee tuition settlement.
                  </p>
                  <a
                    href="https://vartualtutor.paymently.io/paymentlink/default/BDT"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-[#4169E1] hover:underline inline-flex items-center gap-1 pt-0.5"
                  >
                    <span>vartualtutor.paymently.io/paymentlink/default/BDT</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Supported Channels</span>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#D12053] text-white shadow-2xs">bKash</span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#F7941D] text-white shadow-2xs">Nagad</span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#8C3494] text-white shadow-2xs">Rocket</span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#2E3192] text-white shadow-2xs">Upay</span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#172554] text-white shadow-2xs border border-white/20">Visa / Mastercard</span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 border border-white/15 text-white">Internet Banking</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 pt-2 border-t border-white/10">
                All transactions are encrypted with 256-bit SSL banking standards and Bangladesh Bank regulatory protocols.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 12. FAQ ACCORDION SECTION ─── */}
      <section id="faq" className="py-20 sm:py-28 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <SectionLabel label="07" text="FREQUENTLY ASKED QUESTIONS" className="justify-center" theme="dark" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
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
                  className="glass-panel rounded-2xl border border-white/15 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-sm font-bold text-white hover:text-[#8EA7FF] transition-colors">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180 text-[#5B7CFF]" : ""
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
                        className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-3"
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

      {/* ─── 13. FINAL CTA SECTION ─── */}
      <section className="py-20 sm:py-28 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-dock rounded-3xl p-10 sm:p-16 text-center text-white relative overflow-hidden border border-white/20 shadow-2xl">
            {/* Ambient accent glows */}
            <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#4169E1]/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#5B7CFF]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
                Your next great lesson starts here.
              </h2>
              <p className="text-sm sm:text-base text-slate-200 max-w-xl mx-auto leading-relaxed">
                Join thousands of motivated students and certified educators on Bangladesh's premier live tutoring platform.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => navigate("/teachers")}
                  className="px-8 py-4 rounded-full bg-[#4169E1] hover:bg-[#5B7CFF] text-white font-bold text-sm transition-all shadow-[0_4px_24px_rgba(65,105,225,0.35)] active:scale-95 cursor-pointer"
                >
                  Find a Tutor
                </button>
                <button
                  onClick={() => navigate("/teacher-application")}
                  className="px-8 py-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#F8FAFF] font-bold text-sm transition-all border border-white/15 backdrop-blur-md active:scale-95 cursor-pointer"
                >
                  Become a Tutor
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 14. FOUR-COLUMN PROFESSIONAL GLASS FOOTER ─── */}
      <footer className="bg-[#07142F]/85 backdrop-blur-2xl border-t border-white/10 py-16 text-xs text-slate-400 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Column 1: Virtual Tutor */}
            <div className="space-y-3">
              <p className="font-bold text-white text-sm uppercase tracking-wider">Virtual Tutor</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                A trusted online learning platform connecting students with verified teachers across Bangladesh and beyond.
              </p>
              <div className="pt-1">
                <Link to="/teachers" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">Find Tutors</Link>
                <Link to="/teacher-application" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">Become a Tutor</Link>
              </div>
            </div>

            {/* Column 2: Learning */}
            <div className="space-y-2">
              <p className="font-bold text-white text-sm uppercase tracking-wider">Learning</p>
              <Link to="/lessons" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">Lessons</Link>
              <Link to="/assignments" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">Assignments</Link>
              <Link to="/progress" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">Progress</Link>
              <Link to="/community" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">Community</Link>
            </div>

            {/* Column 3: Support */}
            <div className="space-y-2">
              <p className="font-bold text-white text-sm uppercase tracking-wider">Support</p>
              <Link to="/faq" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">FAQ</Link>
              <Link to="/contact" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">Contact Support</Link>
              <Link to="/students" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">Student Learning Requests</Link>
            </div>

            {/* Column 4: Legal */}
            <div className="space-y-2">
              <p className="font-bold text-white text-sm uppercase tracking-wider">Legal</p>
              <Link to="/privacy" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="block py-1 text-slate-300 hover:text-white font-medium transition-colors">Refund Policy</Link>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} Virtual Tutor Pro. All rights reserved.</p>
            <p>Built for serious, high-quality human education.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
