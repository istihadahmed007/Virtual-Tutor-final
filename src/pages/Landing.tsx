import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  GraduationCap,
  Video,
  Users,
  Star,
  ArrowRight,
  Search,
  MessageCircle,
  BookOpen,
  Shield,
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  ChevronRight,
  Globe,
  Zap,
  Brain,
  Calendar,
  PenTool,
  LineChart,
  Heart,
  Award,
  HelpCircle,
  ArrowRightCircle,
  Sparkles,
  FileText,
  Mail,
  Menu,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { subjects } from "@/lib/data";
import { LazyImage } from "@/components/images/LazyImage";
import { HERO_IMAGE, LIVE_CLASS_IMAGE } from "@/lib/images";
import { ContactSection } from "@/components/ContactSection";
import { ContactModal } from "@/components/ContactModal";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
};

const stagger = { transition: { staggerChildren: 0.08 } };

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const teachers = useQuery(api.teachers.list);
  const teacherCount = teachers?.length ?? 0;
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleCTA = (path = "/auth") => {
    navigate(isAuthenticated ? "/dashboard" : path);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl border-b border-stone-200/60 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 min-w-0"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                Virtual Tutor <span className="text-teal-600">Pro</span>
              </span>
            </button>
            <div className="hidden md:flex items-center gap-6">
              <a
                href="#how-it-works"
                className="text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
              >
                How it works
              </a>
              <a
                href="#features"
                className="text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
              >
                Features
              </a>
              <a
                href="#for-tutors"
                className="text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
              >
                For tutors
              </a>
              <a
                href="#faq"
                className="text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
              >
                FAQ
              </a>
              <a
                href="#contact"
                className="text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors font-semibold"
              >
                Contact
              </a>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setContactModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 rounded-xl transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Contact Support
              </button>
              {isAuthenticated ? (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all active:scale-95"
                >
                  Dashboard
                </button>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => navigate("/auth")}
                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => navigate("/auth")}
                    className="px-3 sm:px-5 py-1.5 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all active:scale-95"
                  >
                    Get started
                  </button>
                </div>
              )}

              {/* Mobile hamburger menu toggle */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden p-2 text-slate-600 hover:bg-stone-100 rounded-lg"
                aria-label="Toggle Navigation Menu"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-stone-200/60 bg-white/95 backdrop-blur-xl px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <a
              href="#how-it-works"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-stone-50"
            >
              How it works
            </a>
            <a
              href="#features"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-stone-50"
            >
              Features
            </a>
            <a
              href="#for-tutors"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-stone-50"
            >
              For tutors
            </a>
            <a
              href="#faq"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-stone-50"
            >
              FAQ
            </a>
            <button
              onClick={() => {
                setMobileNavOpen(false);
                setContactModalOpen(true);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-teal-700 hover:bg-teal-50"
            >
              Contact Support
            </button>
            <div className="pt-2 border-t border-stone-100 flex gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    setMobileNavOpen(false);
                    navigate("/dashboard");
                  }}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold"
                >
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileNavOpen(false);
                      navigate("/auth");
                    }}
                    className="flex-1 py-2 border border-stone-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-stone-50"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => {
                      setMobileNavOpen(false);
                      navigate("/auth");
                    }}
                    className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold"
                  >
                    Get started
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div {...fadeUp} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 border border-teal-100 rounded-full text-teal-700 text-xs font-semibold mb-6">
                <Video className="w-3.5 h-3.5" />
                Live classes with real tutors
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-slate-900 leading-tight tracking-tight">
                Learn with the right tutor.
                <span className="block text-teal-600">
                  Progress with confidence.
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-500 max-w-xl leading-relaxed">
                Find trusted tutors, book focused lessons, and build learning
                momentum with feedback and progress tracking designed around your
                goals.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
                <button
                  onClick={() => handleCTA("/auth")}
                  className="group px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-teal-600/15 transition-all flex items-center gap-2.5 text-base active:scale-95"
                >
                  Find a tutor
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("how-it-works")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="px-8 py-4 bg-white border-2 border-stone-200 hover:border-teal-300 text-slate-700 font-semibold rounded-2xl transition-all hover:bg-teal-50/50 flex items-center gap-2 text-base"
                >
                  How it works
                </button>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row items-start gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-500" />
                  <span className="font-semibold text-slate-700">
                    {teacherCount} verified tutors
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-teal-500" />
                  <span className="font-semibold text-slate-700">
                    Personalized learning
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-500" />
                  <span className="font-semibold text-slate-700">
                    Flexible scheduling
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                <LazyImage
                  src={HERO_IMAGE}
                  alt="A tutor conducting a live video lesson with a student"
                  aspectRatio="4/3"
                  className="rounded-3xl"
                  wrapperClassName="rounded-3xl shadow-2xl shadow-slate-200/80"
                  priority
                />
                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl p-3.5 shadow-xl shadow-slate-200/60 border border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Video className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Live session
                      </p>
                      <p className="text-[10px] text-emerald-600 font-semibold">
                        In progress
                      </p>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-3 -right-3 bg-white rounded-2xl p-3 shadow-xl shadow-slate-200/60 border border-stone-100">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      4.9
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              A clearer path from question to confidence
            </h2>
            <p className="mt-3 text-slate-500 max-w-lg mx-auto">
              Four steps to measurable progress
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Choose a goal",
                desc: "Tell us what you want to learn and your current level. We'll match you with tutors who teach your exact subject.",
                icon: Target,
                color: "from-teal-500 to-teal-600",
              },
              {
                step: "02",
                title: "Meet the right tutor",
                desc: "Browse verified profiles, check availability, and book a trial lesson. No commitment required.",
                icon: Users,
                color: "from-amber-500 to-amber-600",
              },
              {
                step: "03",
                title: "Practice with feedback",
                desc: "Join live video lessons, complete assignments, and get detailed feedback on your progress.",
                icon: PenTool,
                color: "from-indigo-500 to-indigo-600",
              },
              {
                step: "04",
                title: "Measure progress",
                desc: "Track completed lessons, grades, and learning streaks. See how far you've come.",
                icon: LineChart,
                color: "from-rose-500 to-rose-600",
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-4`}
                >
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Step {s.step}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1 mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {s.desc}
                </p>
                {i < 3 && (
                  <ChevronRight className="hidden md:block absolute top-7 -right-3 w-5 h-5 text-slate-300" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Everything you need */}
      <section id="features" className="py-16 lg:py-24 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Everything you need to keep learning
            </h2>
            <p className="mt-3 text-slate-500 max-w-lg mx-auto">
              Tools designed to support real learning, not just consume content
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              {
                icon: Search,
                title: "Tutor discovery",
                desc: "Search by subject, filter by level, language, price, and availability. Every tutor is credential-verified.",
              },
              {
                icon: Video,
                title: "Live video lessons",
                desc: "Real-time HD video with whiteboard, screen share, chat, and file sharing. Not pre-recorded content.",
              },
              {
                icon: BookOpen,
                title: "Assignments and feedback",
                desc: "Submit work, get grades and detailed feedback from your tutor. Track due dates and revisions.",
              },
              {
                icon: LineChart,
                title: "Progress tracking",
                desc: "See completed lessons, hours studied, assignment scores, and learning consistency over time.",
              },
              {
                icon: Sparkles,
                title: "AI study companion",
                desc: "Ask for explanations, practice questions, and study plans. A helpful supplement to your tutor.",
              },
              {
                icon: MessageCircle,
                title: "Direct messaging",
                desc: "Message your tutor between lessons. Ask quick questions, share materials, and stay on track.",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.06 }}
                className="p-5 rounded-2xl border border-stone-200/80 hover:border-stone-300/80 hover:shadow-md transition-all bg-white"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Class Experience */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div {...fadeUp}>
              <div className="relative">
                <LazyImage
                  src={LIVE_CLASS_IMAGE}
                  alt="Teacher explaining a topic on a digital whiteboard during a live video class"
                  aspectRatio="4/3"
                  className="rounded-3xl"
                  wrapperClassName="rounded-3xl shadow-2xl shadow-slate-200/60"
                />
                <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-3.5 shadow-xl shadow-slate-200/60 border border-stone-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Real-time chat
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Ask questions live
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
                Your classroom,{" "}
                <span className="text-teal-600">wherever you are</span>
              </h2>
              <p className="mt-5 text-lg text-slate-500 leading-relaxed">
                Not pre-recorded videos. Not chatbots. A real tutor explaining
                concepts, answering your questions, and guiding you through
                practice — live, in real-time.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  { icon: Video, label: "HD Video" },
                  { icon: MessageCircle, label: "Live chat" },
                  { icon: PenTool, label: "Whiteboard" },
                  { icon: Globe, label: "Screen share" },
                  { icon: Zap, label: "Hand raise" },
                  { icon: Heart, label: "Reactions" },
                  { icon: BookOpen, label: "Notes" },
                  { icon: Clock, label: "Timer" },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-3 bg-[#FAFAF8] rounded-xl border border-stone-200/80"
                  >
                    <f.icon className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium text-slate-700">
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* For Students */}
      <section className="py-16 lg:py-24 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeUp}>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                For students who want to{" "}
                <span className="text-teal-600">actually learn</span>
              </h2>
              <p className="mt-4 text-slate-500 leading-relaxed">
                Whether you're preparing for exams, learning a new skill, or need
                help with homework — find a tutor who understands your goals and
                teaches at your pace.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "Search tutors by subject, level, language, and price",
                  "Book trial lessons before committing",
                  "Get assignments graded with detailed feedback",
                  "Track your progress across subjects and sessions",
                  "Message your tutor anytime between lessons",
                  "Use the AI assistant for extra practice and explanations",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCTA("/auth")}
                className="mt-8 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-all active:scale-95"
              >
                Start learning
              </button>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
              <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                    A
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Your dashboard at a glance
                    </p>
                    <p className="text-xs text-slate-400">
                      Everything you need, one click away
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      icon: Calendar,
                      label: "Next lesson",
                      value: "Tomorrow, 4:00 PM",
                      color: "bg-teal-50 text-teal-600",
                    },
                    {
                      icon: BookOpen,
                      label: "Pending work",
                      value: "2 assignments",
                      color: "bg-amber-50 text-amber-600",
                    },
                    {
                      icon: TrendingUp,
                      label: "This week",
                      value: "5 hours studied",
                      color: "bg-indigo-50 text-indigo-600",
                    },
                    {
                      icon: Award,
                      label: "Streak",
                      value: "12 days",
                      color: "bg-rose-50 text-rose-600",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="p-3 bg-[#FAFAF8] rounded-xl border border-stone-200/60"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center mb-2`}
                      >
                        <item.icon className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {item.label}
                      </p>
                      <p className="text-xs font-bold text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* For Tutors */}
      <section id="for-tutors" className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeUp} className="order-2 lg:order-1">
              <div className="bg-[#FAFAF8] rounded-2xl border border-stone-200/80 p-6 space-y-4">
                <p className="text-sm font-bold text-slate-900">
                  Teacher dashboard
                </p>
                <div className="space-y-3">
                  {[
                    {
                      icon: Calendar,
                      text: "See today's schedule and upcoming lessons",
                    },
                    {
                      icon: PenTool,
                      text: "Review submitted assignments and add feedback",
                    },
                    {
                      icon: Users,
                      text: "Manage your students and their progress",
                    },
                    {
                      icon: Clock,
                      text: "Set your availability and accept bookings",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200/60"
                    >
                      <item.icon className="w-4 h-4 text-teal-500 shrink-0" />
                      <span className="text-sm text-slate-600">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
            <motion.div {...fadeUp} className="order-1 lg:order-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                Build your teaching practice,{" "}
                <span className="text-teal-600">your way</span>
              </h2>
              <p className="mt-4 text-slate-500 leading-relaxed">
                Set your schedule, define your subjects, and teach online to
                students who are looking for exactly what you offer. We handle
                bookings, scheduling, and the classroom — you focus on teaching.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "Set your own schedule and availability",
                  "Define your subjects, class types, and pricing",
                  "Get matched with students who need your expertise",
                  "Manage assignments, grades, and feedback in one place",
                  "Track student progress and session history",
                  "Build your verified tutor profile and reputation",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCTA("/auth")}
                className="mt-8 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-all active:scale-95"
              >
                Become a tutor
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Designed for real progress */}
      <section className="py-16 lg:py-24 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Designed for real progress
            </h2>
            <p className="mt-3 text-slate-500 max-w-lg mx-auto">
              Learning that shows results, not just activity
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Verified tutors",
                desc: "Every tutor goes through credential verification. Learn from professionals you can trust.",
              },
              {
                icon: Brain,
                title: "Structured learning",
                desc: "Lessons, assignments, and feedback work together. Not isolated sessions — a coherent learning path.",
              },
              {
                icon: LineChart,
                title: "Measurable outcomes",
                desc: "Track hours, grades, streaks, and completion rates. See your growth over weeks and months.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-2xl bg-white border border-stone-200/80"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Resume Builder Promo */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-3xl border border-stone-200/80"
            style={{
              background: "linear-gradient(135deg, #faf5ff, #eef2ff)",
            }}
          >
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 md:p-12 lg:p-16">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
                  Build your{' '}
                  <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    professional resume
                  </span>
                </h2>
                <p className="mt-3 text-slate-500 max-w-md">
                  12 templates · AI-powered · ATS-optimized · PDF export
                </p>
                <button
                  onClick={() => navigate("/resume-builder")}
                  className="mt-6 inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-violet-600/20 hover:shadow-xl hover:shadow-violet-600/30 transition-all active:scale-95 text-base"
                >
                  <FileText className="w-5 h-5" />
                  Open Resume Builder
                </button>
              </div>
              <div className="flex-shrink-0 hidden md:block">
                <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                  <FileText className="w-16 h-16 lg:w-20 lg:h-20 text-violet-500" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Subjects */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Learn any subject
            </h2>
            <p className="mt-3 text-slate-500">
              From mathematics to programming, find the right tutor
            </p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {subjects.map((s, i) => (
              <motion.button
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleCTA("/auth")}
                className="p-5 bg-[#FAFAF8] rounded-2xl border border-stone-200/80 hover:border-teal-200 hover:bg-teal-50/50 text-center transition-all group"
              >
                <div className="text-3xl mb-2">{s.icon}</div>
                <h3 className="text-sm font-bold text-slate-900">{s.name}</h3>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 lg:py-24 bg-[#FAFAF8]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Frequently asked questions
            </h2>
          </motion.div>
          <div className="space-y-4">
            {[
              {
                q: "How much do lessons cost?",
                a: "Tutors set their own rates. You'll see the price before booking. There are no hidden fees. Trial lessons may be offered at a reduced rate by individual tutors.",
              },
              {
                q: "How are tutors verified?",
                a: "Every tutor submits their NID, educational certificates, and teaching credentials. Our team reviews each application before a tutor can accept students.",
              },
              {
                q: "How do I book a lesson?",
                a: "Find a tutor, check their availability, choose a date and time, and confirm. You'll receive a confirmation with all lesson details.",
              },
              {
                q: "Can I cancel a booking?",
                a: "Yes. You can cancel a booking up to 2 hours before the scheduled lesson. Check the tutor's cancellation policy for specifics.",
              },
              {
                q: "Is my personal information safe?",
                a: "Yes. NID documents, student cards, and other sensitive data are stored securely and never shown publicly. Only authorized administrators can access verification documents.",
              },
              {
                q: "What does the AI assistant do?",
                a: "The AI assistant can help you with explanations, practice questions, and study plans. It's a supplement to your tutor, not a replacement. Always verify AI-generated answers with your tutor or trusted sources.",
              },
              {
                q: "Can I try before committing?",
                a: "Yes. Many tutors offer trial lessons. You can also message a tutor before booking to make sure they're a good fit.",
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border border-stone-200/80 p-5"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                      {faq.q}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-teal-600 to-teal-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Start your learning journey
            </h2>
            <p className="mt-6 text-lg text-teal-100 max-w-xl mx-auto">
              Find a tutor, book your first lesson, and take the next step in
              your learning.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleCTA("/auth")}
                className="px-10 py-4 bg-white text-teal-700 font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:bg-teal-50 flex items-center gap-2.5 text-base active:scale-95"
              >
                Get started <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleCTA("/auth")}
                className="px-10 py-4 bg-teal-500/30 text-white font-semibold rounded-2xl border border-teal-400/30 hover:bg-teal-500/40 transition-all text-base"
              >
                Become a tutor
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Direct Contact & Inquiries Section */}
      <ContactSection />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                Virtual Tutor Pro
              </span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} Virtual Tutor Pro. Learn from real
              people. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a href="#features" className="hover:text-white transition-colors">
                Features
              </a>
              <a href="#for-tutors" className="hover:text-white transition-colors">
                Teach With Us
              </a>
              <button
                onClick={() => setContactModalOpen(true)}
                className="hover:text-white transition-colors font-semibold text-teal-400"
              >
                Contact Support (istihadahmed1163@gmail.com / info@vartualtutor.com)
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Support Dialog */}
      <ContactModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
      />
    </div>
  );
}
