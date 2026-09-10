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
import { BrandLogo } from "@/components/BrandLogo";
import { CinematicHeroBackground } from "@/components/CinematicHeroBackground";
import { FloatingParticles } from "@/components/FloatingParticles";
import {
  SectionLabel,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
  PillButton,
  StatBlock,
  FloatingBadge,
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
  Laptop,
  PenTool,
  Brain,
  FileCheck,
  ArrowRight,
  Plus,
} from "lucide-react";

// Subtle ambient particle canvas for warm, breathing atmosphere
function AmbientAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 700);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || 700;
    };
    window.addEventListener("resize", handleResize);

    const particleCount = 28;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.2 - Math.random() * 0.3,
      radius: 1.2 + Math.random() * 2.2,
      alpha: 0.15 + Math.random() * 0.35,
      hue: Math.random() > 0.4 ? 20 : 35,
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
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 55%, 0.4)`;
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
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.5, 0.35],
          x: [0, 20, 0],
          y: [0, -15, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-radial from-[#F26522]/12 via-[#F26522]/4 to-transparent blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.1, 0.95, 1.1],
          opacity: [0.25, 0.4, 0.25],
          x: [0, -25, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-20 right-1/4 w-[28rem] h-[28rem] rounded-full bg-radial from-[#EAA824]/10 via-[#F26522]/3 to-transparent blur-3xl"
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />
    </div>
  );
}

// Audio visualizer waveform bars component with dynamic glowing audio pulse
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");

  // Interactive Live Demo tab state
  const [activeDemoTab, setActiveDemoTab] = useState<"whiteboard" | "ai" | "video" | "homework">("whiteboard");

  // Query verified teachers
  const teachersQuery = useQuery(api.teachers.list);
  const teachers = teachersQuery ?? [];

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
          t.subjects?.some((s) =>
            s.toLowerCase().includes(selectedSubject.toLowerCase())
          );
        const matchesSearch =
          !searchQuery.trim() ||
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subjects?.some((s) =>
            s.toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          t.title?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSubject && matchesSearch;
      })
      .slice(0, 6);
  }, [teachers, selectedSubject, searchQuery]);

  const handleAuthAction = (path: string = "/auth") => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate(path);
    }
  };

  // Stagger animation variants
  const heroContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const heroItemVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: "easeOut",
      },
    },
  };

  const shouldReduceMotion = useReducedMotion();

  // Mouse parallax motion values for Hero section
  const heroMouseX = useMotionValue(0);
  const heroMouseY = useMotionValue(0);

  // Organic spring physics for smooth, responsive parallax tracking
  const springDefault = { damping: 28, stiffness: 75, mass: 0.5 };
  const smoothX = useSpring(heroMouseX, springDefault);
  const smoothY = useSpring(heroMouseY, springDefault);

  // Deep layer spring (slower, heavier mass for background/anchor elements)
  const springDeep = { damping: 35, stiffness: 50, mass: 0.8 };
  const deepSmoothX = useSpring(heroMouseX, springDeep);
  const deepSmoothY = useSpring(heroMouseY, springDeep);

  // Floating foreground spring (snappier, lighter mass for interactive buttons & pills)
  const springFloat = { damping: 22, stiffness: 95, mass: 0.35 };
  const floatSmoothX = useSpring(heroMouseX, springFloat);
  const floatSmoothY = useSpring(heroMouseY, springFloat);

  // Multi-layered parallax transforms:
  // 1. Top Pill Badge: slight forward depth
  const badgeParallaxX = useTransform(smoothX, (v) => (shouldReduceMotion ? 0 : v * 0.016));
  const badgeParallaxY = useTransform(smoothY, (v) => (shouldReduceMotion ? 0 : v * 0.016));

  // 2. Display Headline: counter-parallax (deep layer, creating huge depth against floating particles)
  const headlineParallaxX = useTransform(deepSmoothX, (v) => (shouldReduceMotion ? 0 : v * -0.026));
  const headlineParallaxY = useTransform(deepSmoothY, (v) => (shouldReduceMotion ? 0 : v * -0.022));

  // 3. Editorial Subtitle: mid-depth layer
  const subtitleParallaxX = useTransform(smoothX, (v) => (shouldReduceMotion ? 0 : v * -0.014));
  const subtitleParallaxY = useTransform(smoothY, (v) => (shouldReduceMotion ? 0 : v * -0.012));

  // 4. Action CTA Buttons: elevated forward layer
  const buttonsParallaxX = useTransform(floatSmoothX, (v) => (shouldReduceMotion ? 0 : v * 0.032));
  const buttonsParallaxY = useTransform(floatSmoothY, (v) => (shouldReduceMotion ? 0 : v * 0.026));

  // 5. Search Bar & Subject Pills: crisp interactive foreground
  const searchParallaxX = useTransform(smoothX, (v) => (shouldReduceMotion ? 0 : v * 0.02));
  const searchParallaxY = useTransform(smoothY, (v) => (shouldReduceMotion ? 0 : v * 0.016));

  // 6. Metrics Pills: counter-depth layer
  const metricsParallaxX = useTransform(deepSmoothX, (v) => (shouldReduceMotion ? 0 : v * -0.024));
  const metricsParallaxY = useTransform(deepSmoothY, (v) => (shouldReduceMotion ? 0 : v * -0.018));

  // 7. Interactive Classroom Architecture Showcase Card: 3D perspective tilt + subtle translation
  const cardParallaxX = useTransform(smoothX, (v) => (shouldReduceMotion ? 0 : v * 0.014));
  const cardParallaxY = useTransform(smoothY, (v) => (shouldReduceMotion ? 0 : v * 0.012));
  const cardRotateX = useTransform(smoothY, [-400, 400], shouldReduceMotion ? [0, 0] : [3.5, -3.5]);
  const cardRotateY = useTransform(smoothX, [-600, 600], shouldReduceMotion ? [0, 0] : [-4, 4]);

  // 8. Lateral floating perspective badges (visible on desktop viewports)
  const leftBadgeX = useTransform(floatSmoothX, (v) => (shouldReduceMotion ? 0 : v * 0.045));
  const leftBadgeY = useTransform(floatSmoothY, (v) => (shouldReduceMotion ? 0 : v * 0.038));
  const rightBadgeX = useTransform(floatSmoothX, (v) => (shouldReduceMotion ? 0 : v * -0.042));
  const rightBadgeY = useTransform(floatSmoothY, (v) => (shouldReduceMotion ? 0 : v * -0.036));

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      heroMouseX.set(e.clientX - centerX);
      heroMouseY.set(e.clientY - centerY);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [heroMouseX, heroMouseY]);

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-[#F26522]/30 selection:text-white relative">
      {/* ─── Global Full-Page Vesper WebGL Volumetric Stardust Ribbon Background ─── */}
      <CinematicHeroBackground isFixed={true} className="fixed inset-0 z-0 pointer-events-none" />

      {/* ─── Interactive Floating Particles Background (Framer Motion) ─── */}
      <FloatingParticles count={42} className="fixed inset-0 z-0 pointer-events-none" />

      {/* ─── 1. NAVBAR ─── */}
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 text-white transition-colors">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
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

          {/* Desktop Links - Vesper style pill navigation */}
          <nav className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs sm:text-sm font-medium text-white/80">
            <Link
              to="/teachers"
              className="px-3 py-1 rounded-full hover:text-white hover:bg-white/10 transition-colors"
            >
              Find Tutors
            </Link>
            <Link
              to="/teacher-application"
              className="px-3 py-1 rounded-full hover:text-white hover:bg-white/10 transition-colors"
            >
              Become a Tutor
            </Link>
            <a
              href="#how-it-works"
              className="px-3 py-1 rounded-full hover:text-white hover:bg-white/10 transition-colors"
            >
              How It Works
            </a>
            <Link
              to="/students"
              className="px-3 py-1 rounded-full hover:text-white hover:bg-white/10 transition-colors"
            >
              Student Requests
            </Link>
            <Link
              to="/faq"
              className="px-3 py-1 rounded-full hover:text-white hover:bg-white/10 transition-colors"
            >
              FAQ
            </Link>
          </nav>

          {/* Desktop CTA matching Capture.PNG */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer"
              >
                Go to Workspace
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/auth?mode=login")}
                  className="px-3.5 py-1.5 rounded-full text-white/80 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate("/auth?mode=signup")}
                  className="px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer"
                >
                  Start for Free
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu with AnimatePresence */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden border-b border-white/10 bg-black/95 px-4 pt-2 pb-6 space-y-3 overflow-hidden text-white"
            >
              <Link
                to="/teachers"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-white/90 hover:text-white"
              >
                Find Tutors
              </Link>
              <Link
                to="/teacher-application"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-white/90 hover:text-white"
              >
                Become a Tutor
              </Link>
              <Link
                to="/students"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-white/90 hover:text-white"
              >
                Student Requests
              </Link>
              <Link
                to="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-white/90 hover:text-white"
              >
                FAQ
              </Link>
              <div className="pt-4 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleAuthAction();
                  }}
                  className="w-full py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Start for Free"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── 2. HERO SECTION WITH RICH MOTION & MOUSE PARALLAX ─── */}
      <section className="relative pt-16 pb-24 sm:pt-24 sm:pb-36 overflow-hidden bg-transparent text-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 relative z-10">
          {/* Ambient Parallax Floating Badges in Hero Lateral Space */}
          <motion.div
            style={{ x: leftBadgeX, y: leftBadgeY }}
            className="hidden lg:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/5 border border-white/12 backdrop-blur-xl absolute top-12 left-4 xl:left-12 z-20 pointer-events-none shadow-[0_8px_30px_rgba(0,0,0,0.5)] will-change-transform"
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-white">Interactive HD Classroom</p>
              <p className="text-[9px] text-white/50">Zero lag WebRTC audio/video</p>
            </div>
          </motion.div>

          <motion.div
            style={{ x: rightBadgeX, y: rightBadgeY }}
            className="hidden lg:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/5 border border-white/12 backdrop-blur-xl absolute top-36 right-4 xl:right-12 z-20 pointer-events-none shadow-[0_8px_30px_rgba(0,0,0,0.5)] will-change-transform"
          >
            <div className="w-7 h-7 rounded-xl bg-[#F26522]/20 border border-[#F26522]/30 flex items-center justify-center text-[#F26522]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-white">Verified Educators</p>
              <p className="text-[9px] text-white/50">Top university faculty</p>
            </div>
          </motion.div>

          <motion.div
            variants={heroContainerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto text-center"
          >
            {/* Vesper Style Pill Badge */}
            <motion.div variants={heroItemVariants} className="flex justify-center mb-6">
              <motion.div
                style={{ x: badgeParallaxX, y: badgeParallaxY }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white/90 text-xs font-medium tracking-wide will-change-transform"
              >
                <Plus className="w-3.5 h-3.5 text-white/70" />
                <span>Live 1-on-1 Academic Platform</span>
              </motion.div>
            </motion.div>

            {/* Display Headline with deep counter-parallax */}
            <motion.div variants={heroItemVariants}>
              <motion.h1
                style={{ x: headlineParallaxX, y: headlineParallaxY }}
                className="text-4xl sm:text-6xl lg:text-[4.25rem] font-medium tracking-[-0.035em] leading-[1.12] text-white text-center will-change-transform"
              >
                Learn from <span className="font-serif italic font-normal text-white">elite educators</span> on your
                <br className="hidden sm:block" /> terms in minutes.
              </motion.h1>
            </motion.div>

            {/* Editorial Subtitle with mid-depth parallax */}
            <motion.div variants={heroItemVariants}>
              <motion.p
                style={{ x: subtitleParallaxX, y: subtitleParallaxY }}
                className="mt-6 text-base sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed font-normal text-center will-change-transform"
              >
                Connect with verified teachers for 1-on-1 live lessons, interactive digital whiteboards,
                and personalized monthly tuition tailored to your curriculum.
              </motion.p>
            </motion.div>

            {/* Vesper Buttons with forward parallax */}
            <motion.div variants={heroItemVariants}>
              <motion.div
                style={{ x: buttonsParallaxX, y: buttonsParallaxY }}
                className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 will-change-transform"
              >
                <button
                  onClick={() => navigate("/teachers")}
                  className="w-full sm:w-auto px-7 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-all shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 cursor-pointer text-center"
                >
                  Start for Free
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById("classroom-demo");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full sm:w-auto px-7 py-3 rounded-full bg-white/5 border border-white/20 text-white font-medium text-sm hover:bg-white/10 transition-all backdrop-blur-sm hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>See it in action</span>
                  <ArrowRight className="w-4 h-4 text-white/70" />
                </button>
              </motion.div>
            </motion.div>

            {/* Search / Filter bar with interactive foreground parallax */}
            <motion.div variants={heroItemVariants}>
              <motion.div
                style={{ x: searchParallaxX, y: searchParallaxY }}
                className="mt-8 max-w-xl mx-auto will-change-transform"
              >
                <div className="flex items-center bg-white/10 backdrop-blur-xl rounded-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-1.5 focus-within:border-white focus-within:ring-2 focus-within:ring-white/20 transition-all">
                  <div className="pl-4 text-white/50">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by subject, educator name, or curriculum..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        navigate(`/teachers?q=${encodeURIComponent(searchQuery)}`);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm text-white placeholder:text-white/40 bg-transparent focus:outline-hidden"
                  />
                  <button
                    onClick={() => navigate(`/teachers?q=${encodeURIComponent(searchQuery)}`)}
                    className="shrink-0 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    Search
                  </button>
                </div>

                {/* Quick subject pills with dark glass style */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  {subjectPills.slice(0, 6).map((sub) => (
                    <motion.button
                      key={sub}
                      whileHover={{ y: -2, scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setSelectedSubject(sub);
                        navigate(`/teachers?subject=${encodeURIComponent(sub)}`);
                      }}
                      className="text-xs px-3 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer backdrop-blur-xs"
                    >
                      {sub}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Bottom 3 Metric Pills with counter-depth parallax */}
            <motion.div variants={heroItemVariants}>
              <motion.div
                style={{ x: metricsParallaxX, y: metricsParallaxY }}
                className="mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-white/70 font-medium will-change-transform"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-md">
                  <span className="font-mono text-white/40 text-[11px]">||</span>
                  <span>15,000+ verified educators</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-md">
                  <Plus className="w-3.5 h-3.5 text-white/70" />
                  <span>98.4% student grade improvement</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-md">
                  <div className="flex -space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-400 border border-black inline-block" />
                    <span className="w-4 h-4 rounded-full bg-amber-400 border border-black inline-block" />
                    <span className="w-4 h-4 rounded-full bg-indigo-400 border border-black inline-block" />
                  </div>
                  <span>50,000+ active learners enrolled</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* ─── INTERACTIVE CLASSROOM ARCHITECTURE SHOWCASE (WITH 3D PERSPECTIVE PARALLAX & TABS) ─── */}
          <motion.div
            id="classroom-demo"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
            style={{
              x: cardParallaxX,
              y: cardParallaxY,
              rotateX: cardRotateX,
              rotateY: cardRotateY,
              transformPerspective: 1200,
            }}
            className="mt-16 max-w-4xl mx-auto will-change-transform"
          >
            <div className="bg-[#0B0B0B]/90 backdrop-blur-2xl rounded-3xl border border-white/12 p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
              {/* Header with Live Status & Audio Waveform */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F26522] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Live Classroom Engine
                    </span>
                  </div>
                  <LiveWaveform />
                </div>

                {/* Interactive Demo Mode Tabs */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 text-xs">
                  <button
                    onClick={() => setActiveDemoTab("whiteboard")}
                    className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                      activeDemoTab === "whiteboard"
                        ? "bg-white text-black shadow-xs font-semibold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <PenTool className="w-3 h-3" />
                      Whiteboard
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveDemoTab("ai")}
                    className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                      activeDemoTab === "ai"
                        ? "bg-white text-black shadow-xs font-semibold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Brain className="w-3 h-3" />
                      AI Assistant
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveDemoTab("video")}
                    className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                      activeDemoTab === "video"
                        ? "bg-white text-black shadow-xs font-semibold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Video className="w-3 h-3" />
                      1080p Video
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveDemoTab("homework")}
                    className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                      activeDemoTab === "homework"
                        ? "bg-white text-black shadow-xs font-semibold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FileCheck className="w-3 h-3" />
                      Assignments
                    </span>
                  </button>
                </div>
              </div>

              {/* Animated Interactive Tab Viewport */}
              <div className="relative rounded-2xl bg-[#111111] text-white p-5 sm:p-6 overflow-hidden min-h-[260px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  {/* TAB 1: WHITEBOARD */}
                  {activeDemoTab === "whiteboard" && (
                    <motion.div
                      key="whiteboard"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>Collaborative Math Canvas · Room #8492</span>
                        </div>
                        <span className="text-[#F26522] font-mono">Vector Pen 2px</span>
                      </div>

                      <div className="bg-[#1A1A1A] rounded-xl p-4 sm:p-5 border border-white/10 font-mono text-xs sm:text-sm">
                        <div className="text-emerald-400 mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Calculus Integration Proof:</span>
                        </div>
                        <p className="text-white/90">∫ (3x² + 4x - 5) dx = x³ + 2x² - 5x + C</p>
                        <p className="text-[#F26522] mt-2 text-xs">// Tutor Note: Notice the constant of integration C is required.</p>
                      </div>

                      {/* Animated simulated cursor */}
                      <div className="flex items-center justify-between text-xs text-white/50 pt-1">
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ x: [0, 40, 15, 0], y: [0, -5, 5, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="inline-flex items-center gap-1.5 bg-[#F26522] text-white px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold shadow-xs"
                          >
                            <PenTool className="w-2.5 h-2.5" />
                            <span>Dr. Rafiqul Islam</span>
                          </motion.div>
                          <span className="text-white/40">Drawing step 4...</span>
                        </div>
                        <span className="text-emerald-400 text-[11px]">Real-time WebSockets &lt;15ms</span>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: AI ASSISTANT */}
                  {activeDemoTab === "ai" && (
                    <motion.div
                      key="ai"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#F26522]" />
                          <span>AI Pedagogical Assistant · Instant Step Solver</span>
                        </div>
                        <span className="text-emerald-400 font-mono">Gemini 2.5 Active</span>
                      </div>

                      <div className="bg-[#1A1A1A] rounded-xl p-4 sm:p-5 border border-white/10 text-xs sm:text-sm space-y-2">
                        <div className="text-white/60 text-xs">Student Question: "Why does light refract at boundaries?"</div>
                        <p className="text-[#F26522] font-semibold">Fermat's Principle of Least Time:</p>
                        <p className="text-white/80 leading-relaxed">
                          Light takes the path that requires the shortest travel time. Because light travels slower in optical mediums (n &gt; 1), it bends toward the normal to minimize overall duration.
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-white/50 pt-1">
                        <span className="text-white/40">Automated lesson summary generated after every class</span>
                        <span className="text-[#F26522] text-[11px] font-semibold">1-Click PDF Export</span>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: VIDEO */}
                  {activeDemoTab === "video" && (
                    <motion.div
                      key="video"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-emerald-400" />
                          <span>WebRTC Low Latency Video Pipeline</span>
                        </div>
                        <span className="text-emerald-400 font-mono">1080p @ 60fps · 24ms</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#1A1A1A] rounded-xl p-3 border border-white/10 flex flex-col justify-between aspect-video">
                          <div className="flex items-center justify-between text-[11px] text-white/70">
                            <span>Tutor View</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          </div>
                          <div className="text-center font-medium text-xs text-white/80">
                            Dr. Rafiqul Islam (Faculty)
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-white/40">
                            <span>Mic Active</span>
                            <span>Noise Suppressed</span>
                          </div>
                        </div>

                        <div className="bg-[#1A1A1A] rounded-xl p-3 border border-white/10 flex flex-col justify-between aspect-video">
                          <div className="flex items-center justify-between text-[11px] text-white/70">
                            <span>Student View</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          </div>
                          <div className="text-center font-medium text-xs text-white/80">
                            Sadia Rahman (A-Level)
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-white/40">
                            <span>Camera On</span>
                            <span>Screen Share Ready</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-white/50 pt-1">
                        <span>Adaptive Bitrate Streaming optimized for Bangladeshi networks</span>
                        <span className="text-white/40">End-to-End Encrypted</span>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4: ASSIGNMENTS */}
                  {activeDemoTab === "homework" && (
                    <motion.div
                      key="homework"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-[#F26522]" />
                          <span>Structured Homework & Feedback Cycle</span>
                        </div>
                        <span className="text-emerald-400 font-mono">Graded 98/100</span>
                      </div>

                      <div className="bg-[#1A1A1A] rounded-xl p-4 sm:p-5 border border-white/10 text-xs sm:text-sm space-y-2">
                        <div className="flex items-center justify-between text-white/70">
                          <span className="font-semibold text-white">Problem Set #4: Rotational Dynamics</span>
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[11px] font-mono">
                            Grade: A+
                          </span>
                        </div>
                        <p className="text-white/70 text-xs">
                          Tutor Feedback: "Excellent torque derivation on question 3. Watch out for unit consistency on angular momentum in question 5."
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-white/50 pt-1">
                        <span>Students submit PDF/Images; Tutors annotate with digital ink</span>
                        <span className="text-[#F26522] text-[11px] font-semibold">Automated Progress Graph</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bottom Classroom Join Button */}
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <span className="text-[#F26522] font-semibold">Next Demo Session:</span>
                    <span>AP Calculus BC with Live Whiteboard</span>
                  </div>
                  <PrimaryButton
                    size="sm"
                    onClick={() => navigate("/classroom/demo")}
                  >
                    Enter Live Demo Room
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 3. STATS STRIP WITH SCROLL MOTION ─── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={sectionVariants}
        className="py-12 border-y border-white/10 bg-black/40 backdrop-blur-md relative z-10 text-white"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <StatBlock
              label="Verified Academic Tutors"
              value="150+"
              subtext="Audited credentials from top institutions"
              icon={GraduationCap}
              theme="dark"
            />
            <StatBlock
              label="Active Monthly Learners"
              value="4,800+"
              subtext="Students across English & Bangla Mediums"
              icon={Users}
              theme="dark"
            />
            <StatBlock
              label="Average Lesson Rating"
              value="4.9"
              suffix="/ 5.0"
              subtext="Based on 1,200+ verified student reviews"
              icon={Star}
              theme="dark"
            />
            <StatBlock
              label="Interactive Classroom Time"
              value="25,000+"
              suffix="hrs"
              subtext="Real-time HD audio, video & whiteboards"
              icon={Clock}
              theme="dark"
            />
          </div>
        </div>
      </motion.section>

      {/* ─── 4. FEATURED TUTORS DIRECTORY WITH MOTION ─── */}
      <section className="py-20 sm:py-28 relative z-10 text-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={sectionVariants}
            className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
          >
            <SectionHeader
              number="01"
              label="FACULTY DIRECTORY"
              title="Learn from Dedicated, Accredited Tutors"
              description="Review instructor credentials, student testimonials, hourly fees, and monthly packages."
              theme="dark"
            />
            <button
              onClick={() => navigate("/teachers")}
              className="px-5 py-2.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-medium transition-all backdrop-blur-md hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>Browse All Tutors</span>
              <ArrowRight className="w-4 h-4 text-white/70" />
            </button>
          </motion.div>

          {filteredTeachers.length > 0 ? (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08 },
                },
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredTeachers.map((tutor) => (
                <motion.div
                  key={tutor._id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <TutorCard
                    tutor={tutor as any}
                    theme="dark"
                    onBook={() => navigate(`/teachers/${tutor._id}`)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16 bg-[#0B0B0B]/75 backdrop-blur-xl rounded-3xl border border-white/10 p-8 text-white">
              <GraduationCap className="w-12 h-12 text-[#F26522] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white">
                No Tutors Found For This Subject
              </h3>
              <p className="text-sm text-white/70 mt-1 max-w-md mx-auto">
                Explore our full tutor directory or submit an inquiry with your exact syllabus needs.
              </p>
              <div className="mt-6">
                <PrimaryButton
                  size="sm"
                  onClick={() => {
                    setSelectedSubject("All");
                    setSearchQuery("");
                    navigate("/teachers");
                  }}
                >
                  View All Educators
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── 5. HOW IT WORKS (STEP-BY-STEP REVEAL) ─── */}
      <section id="how-it-works" className="py-20 sm:py-28 border-y border-white/10 bg-black/40 backdrop-blur-md relative z-10 text-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={sectionVariants}
          >
            <SectionHeader
              number="02"
              label="EFFORTLESS PROCESS"
              title="How Virtual Tutor Works"
              description="From discovery to your first live lesson, academic excellence is simple and transparent."
              align="center"
              theme="dark"
              className="mb-16"
            />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-[#0B0B0B]/75 backdrop-blur-xl rounded-3xl p-8 border border-white/10 flex flex-col justify-between transition-all hover:border-white/25 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 text-white flex items-center justify-center font-bold text-lg mb-6 shadow-xs">
                  01
                </div>
                <h3 className="text-xl font-medium tracking-tight text-white mb-2">
                  Discover Your Perfect Tutor
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Filter by subject, board curriculum (Cambridge, Edexcel, National Curriculum), hourly budget, and availability slots.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-xs font-semibold text-[#F26522]">
                <Search className="w-4 h-4" />
                <span>Search & Verify Credentials</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-[#0B0B0B]/75 backdrop-blur-xl rounded-3xl p-8 border border-white/10 flex flex-col justify-between transition-all hover:border-[#F26522]/40 hover:shadow-[0_12px_32px_rgba(242,101,34,0.15)]"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#F26522] text-white flex items-center justify-center font-bold text-lg mb-6 shadow-xs">
                  02
                </div>
                <h3 className="text-xl font-medium tracking-tight text-white mb-2">
                  Schedule a Trial or Monthly Plan
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Book directly with transparent pricing in Bangladeshi Taka (Tk). Receive calendar sync, automated reminders, and syllabus notes.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-xs font-semibold text-[#F26522]">
                <Calendar className="w-4 h-4" />
                <span>Instant Confirmation</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-[#0B0B0B]/75 backdrop-blur-xl rounded-3xl p-8 border border-white/10 flex flex-col justify-between transition-all hover:border-white/25 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 text-white flex items-center justify-center font-bold text-lg mb-6 shadow-xs">
                  03
                </div>
                <h3 className="text-xl font-medium tracking-tight text-white mb-2">
                  Learn in the Live Classroom
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Enter the virtual classroom with HD audio/video, real-time shared whiteboard, screen sharing, homework assignments, and AI summaries.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-xs font-semibold text-[#F26522]">
                <Video className="w-4 h-4" />
                <span>Real-Time Collaboration</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 6. CLASSROOM FEATURES ─── */}
      <section className="py-20 sm:py-28 relative z-10 text-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={sectionVariants}
            >
              <SectionHeader
                number="03"
                label="PROPRIETARY TECH"
                title="A Live Classroom Built for True Comprehension"
                description="Unlike generic video meetings, Virtual Tutor provides academic-first tools tailored for problem solving, equations, and interactive exercises."
                theme="dark"
                className="mb-8"
              />

              <div className="space-y-6">
                <motion.div
                  whileHover={{ x: 6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-4 p-3 rounded-2xl transition-colors hover:bg-white/5"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#F26522] shrink-0 shadow-2xs">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-base text-white">
                      Collaborative Digital Whiteboard
                    </h4>
                    <p className="text-sm text-white/70 mt-1">
                      Both student and tutor draw, write formulas, graph functions, and annotate diagrams in real-time.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ x: 6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-4 p-3 rounded-2xl transition-colors hover:bg-white/5"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#F26522] shrink-0 shadow-2xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-base text-white">
                      AI-Powered Academic Assistant
                    </h4>
                    <p className="text-sm text-white/70 mt-1">
                      Get instant step-by-step math explanations, essay proofreading, and automated lesson summaries.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ x: 6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-4 p-3 rounded-2xl transition-colors hover:bg-white/5"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#F26522] shrink-0 shadow-2xs">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-base text-white">
                      Structured Homework & Assessments
                    </h4>
                    <p className="text-sm text-white/70 mt-1">
                      Tutors assign problem sets directly in the portal; students upload work for annotated grading and feedback.
                    </p>
                  </div>
                </motion.div>
              </div>

              <div className="mt-10">
                <PrimaryButton
                  size="md"
                  onClick={() => navigate("/classroom/demo")}
                >
                  Test Demo Classroom
                </PrimaryButton>
              </div>
            </motion.div>

            {/* Visual Classroom Representation with animated glow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl bg-[#0B0B0B]/85 backdrop-blur-2xl border border-white/15 p-6 sm:p-8 text-white overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium text-sm">Classroom Room #8492</span>
                </div>
                <div className="flex items-center gap-2">
                  <LiveWaveform />
                  <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-white/80">
                    48 mins elapsed
                  </span>
                </div>
              </div>

              {/* Whiteboard simulation canvas */}
              <div className="bg-[#141414] rounded-2xl p-6 border border-white/10 aspect-video flex flex-col justify-between relative overflow-hidden">
                <div className="font-mono text-xs text-white/60 space-y-1 relative z-10">
                  <p className="text-[#F26522]">// Integral Problem 3.2:</p>
                  <p className="text-white text-sm">∫ (3x² + 4x - 5) dx = x³ + 2x² - 5x + C</p>
                  <p className="text-emerald-400 mt-2">✓ Verified: Derivative d/dx matches integrand.</p>
                </div>

                {/* Animated pen trajectory indicator */}
                <motion.div
                  animate={{
                    x: [0, 80, 40, 120, 0],
                    y: [0, 20, -10, 15, 0],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-16 right-16 w-32 h-16 pointer-events-none opacity-40"
                >
                  <svg viewBox="0 0 100 50" className="w-full h-full stroke-[#F26522] fill-none stroke-2">
                    <motion.path
                      d="M 10,25 Q 50,5 90,25 T 100,45"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </svg>
                </motion.div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-white/60 relative z-10">
                  <span>Tutor cursor: Dr. Rafiqul Islam</span>
                  <span className="text-[#F26522]">Live Sync Active</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
                    ST
                  </div>
                  <span className="text-xs text-white/80">Sadia Rahman (Student)</span>
                </div>
                <span className="text-xs text-white/40">1080p WebRTC Low Latency</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 7. CALL TO ACTION & FOOTER ─── */}
      <section className="py-20 sm:py-28 border-t border-white/10 bg-black/40 backdrop-blur-md text-white relative overflow-hidden z-10">
        {/* Subtle glowing radial mesh */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 right-1/3 w-[36rem] h-[36rem] bg-radial from-[#F26522]/30 to-transparent rounded-full blur-3xl pointer-events-none"
        />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={sectionVariants}
          >
            <SectionLabel number="04" text="ACADEMIC TRANSFORMATION" theme="dark" className="mb-4 text-[#F26522]" />
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight max-w-3xl mx-auto leading-tight">
              Ready to Accelerate Your Academic Journey?
            </h2>
            <p className="mt-6 text-sm sm:text-base text-white/70 max-w-xl mx-auto leading-relaxed">
              Join thousands of motivated students and certified educators on Bangladesh's premier live learning platform.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <PrimaryButton
                size="lg"
                onClick={() => handleAuthAction("/auth?mode=signup")}
              >
                Get Started for Free
              </PrimaryButton>
              <SecondaryButton
                size="lg"
                onClick={() => navigate("/teachers")}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Browse Qualified Educators
              </SecondaryButton>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 8. FOOTER ─── */}
      <footer className="bg-black/85 backdrop-blur-xl border-t border-white/10 py-12 relative z-10 text-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <BrandLogo
              variant="horizontal"
              size="sm"
              showSubtext={true}
              isDark={true}
            />
            <div className="flex flex-wrap items-center gap-6 text-xs text-white/70">
              <Link to="/teachers" className="hover:text-white transition-colors">
                Find Tutors
              </Link>
              <Link to="/teacher-application" className="hover:text-white transition-colors">
                Teach on Virtual Tutor
              </Link>
              <Link to="/faq" className="hover:text-white transition-colors">
                FAQ
              </Link>
              <Link to="/contact" className="hover:text-white transition-colors">
                Contact Support
              </Link>
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </div>
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} Virtual Tutor Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
