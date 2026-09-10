import React, { useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Shield,
  Lock,
  FileText,
  Eye,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Server,
  Database,
  UserCheck,
  Sparkles,
  Scale,
  Clock,
  Printer,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function PrivacyPolicy() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "terms" ? "terms" : "privacy";
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">(initialTab);

  const handleTabChange = (tab: "privacy" | "terms") => {
    setActiveTab(tab);
    setSearchParams({ tab });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const lastUpdated = "September 9, 2026";

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-teal-500/30 selection:text-teal-200">
      {/* ─── STICKY HEADER ─── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/70 border-b border-white/10 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/10 border border-white/10 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
            <div className="h-4 w-px bg-white/15 hidden sm:block" />
            <BrandLogo variant="horizontal" size="sm" isDark={true} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/60 hover:text-white rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <Link
              to="/auth"
              className="btn-metallic-solid px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full hover:scale-105 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO BANNER ─── */}
      <div className="relative py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-b border-white/10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <span>Trust & Legal Center</span>
            <span className="text-white/40">•</span>
            <span className="text-white/60">Updated {lastUpdated}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {activeTab === "privacy" ? "Privacy Policy" : "Terms of Service"}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-white/65 leading-relaxed">
            {activeTab === "privacy"
              ? "We believe your learning journey and personal data deserve uncompromising protection. This policy describes transparently how LiveClass collects, uses, encrypts, and respects your information."
              : "These Terms of Service govern your access to and use of LiveClass, including our virtual classrooms, AI study tools, tutor booking, and community features."}
          </p>

          {/* Policy / Terms Switcher Tabs */}
          <div className="mt-8 inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <button
              onClick={() => handleTabChange("privacy")}
              className={`px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "privacy"
                  ? "bg-white text-black shadow-md"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Privacy Policy</span>
            </button>
            <button
              onClick={() => handleTabChange("terms")}
              className={`px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "terms"
                  ? "bg-white text-black shadow-md"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Terms of Service</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Quick Table of Contents Sidebar */}
          <aside className="lg:col-span-4 order-2 lg:order-1">
            <div className="sticky top-28 p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
                {activeTab === "privacy" ? "Policy Sections" : "Terms Sections"}
              </h3>

              <nav className="space-y-2 text-xs text-white/70">
                {activeTab === "privacy" ? (
                  <>
                    <a href="#summary" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      1. Executive Summary & Principles
                    </a>
                    <a href="#collection" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      2. Information We Collect
                    </a>
                    <a href="#classroom-data" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      3. Live Classrooms & Video Privacy
                    </a>
                    <a href="#ai-processing" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      4. AI Study Assistant & Data Isolation
                    </a>
                    <a href="#usage" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      5. How We Use Information
                    </a>
                    <a href="#children" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      6. Children & Student Privacy (COPPA/FERPA)
                    </a>
                    <a href="#security" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      7. Security & Encryption Safeguards
                    </a>
                    <a href="#rights" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      8. Your Rights (GDPR & CCPA)
                    </a>
                    <a href="#contact" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      9. Contact Privacy Office
                    </a>
                  </>
                ) : (
                  <>
                    <a href="#terms-agreement" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      1. Acceptance of Terms
                    </a>
                    <a href="#terms-accounts" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      2. Eligibility & Account Security
                    </a>
                    <a href="#terms-tutors" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      3. Tutor Verification & Code of Conduct
                    </a>
                    <a href="#terms-bookings" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      4. Bookings, Payments & Cancellations
                    </a>
                    <a href="#terms-ip" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      5. Intellectual Property & Classroom Content
                    </a>
                    <a href="#terms-liability" className="block p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                      6. Disclaimers & Limitation of Liability
                    </a>
                  </>
                )}
              </nav>

              <div className="pt-4 border-t border-white/10">
                <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-200/90 leading-relaxed">
                  <div className="flex items-center gap-2 font-semibold text-teal-300 mb-1">
                    <UserCheck className="w-4 h-4 text-teal-400" />
                    <span>No Third-Party Ad Selling</span>
                  </div>
                  We never sell your personal data or your children's educational records to advertisers or data brokers.
                </div>
              </div>
            </div>
          </aside>

          {/* Legal Text Body */}
          <main className="lg:col-span-8 order-1 lg:order-2 space-y-12 leading-relaxed text-white/80 text-sm sm:text-base">
            {activeTab === "privacy" ? (
              <>
                {/* 1. Summary */}
                <section id="summary" className="space-y-4">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Section 1</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Executive Summary & Core Privacy Principles
                  </h2>
                  <p>
                    LiveClass ("we", "us", or "our") is dedicated to empowering students and tutors through secure, high-quality, 1-on-1 virtual education. We operate under three core privacy commitments:
                  </p>
                  <div className="grid sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10">
                      <div className="text-teal-400 font-semibold text-sm mb-1">Data Minimization</div>
                      <p className="text-xs text-white/60">We only collect information strictly essential for delivering lessons, generating AI study aids, and protecting classroom safety.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10">
                      <div className="text-teal-400 font-semibold text-sm mb-1">Zero Data Brokerage</div>
                      <p className="text-xs text-white/60">We never monetize, auction, or sell your educational records, video streams, or personal identifiers to third-party marketers.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10">
                      <div className="text-teal-400 font-semibold text-sm mb-1">Full User Agency</div>
                      <p className="text-xs text-white/60">You maintain complete ownership of your data, with seamless export, rectification, and deletion controls at any time.</p>
                    </div>
                  </div>
                </section>

                {/* 2. Information Collected */}
                <section id="collection" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    <span>Section 2</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Information We Collect
                  </h2>
                  <p>
                    When you register, book a class, or teach on LiveClass, we process the following categories of data:
                  </p>
                  <ul className="space-y-3 pl-4 list-disc marker:text-teal-400 text-white/75">
                    <li>
                      <strong className="text-white">Account & Identity Information:</strong> Full name, verified email address, authentication credentials (passwords hashed using modern cryptographic salting), role selection (Student, Educator, Administrator), and optional avatar photograph.
                    </li>
                    <li>
                      <strong className="text-white">Educator Professional Credentials:</strong> For tutors applying to the platform, we collect educational degrees, teaching certifications, background verification documents, subject specializations, and professional resumes.
                    </li>
                    <li>
                      <strong className="text-white">Educational & Scheduling Records:</strong> Subjects learned, scheduled session dates and times, lesson notes, assigned homework, progress milestones, and tutor feedback evaluations.
                    </li>
                    <li>
                      <strong className="text-white">Payment & Billing Details:</strong> Transaction records, lesson credits, and payout histories. All sensitive credit card numbers are handled directly by PCI-DSS Level 1 certified payment gateways. LiveClass never stores raw card numbers on our application servers.
                    </li>
                    <li>
                      <strong className="text-white">Technical Diagnostic Data:</strong> IP address, device operating system, browser release, network round-trip latency, WebRTC connection diagnostics (packet loss, audio/video bitrates) utilized solely to troubleshoot classroom connectivity.
                    </li>
                  </ul>
                </section>

                {/* 3. Live Classrooms & Video Privacy */}
                <section id="classroom-data" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <Lock className="w-4 h-4" />
                    <span>Section 3</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Live Classrooms, Whiteboards & Video Privacy
                  </h2>
                  <p>
                    Our interactive digital classrooms are built on WebRTC and LiveKit real-time communication infrastructure:
                  </p>
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block">Encrypted Media Streams</strong>
                        <span className="text-xs text-white/70">
                          All real-time audio and video communications are encrypted in transit using DTLS and SRTP standards. Only authorized classroom participants and instructors granted access tokens may enter the session.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pt-3 border-t border-white/10">
                      <Eye className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block">No Surreptitious Recording</strong>
                        <span className="text-xs text-white/70">
                          Class sessions are never recorded in secret. If a review recording is enabled for educational revision, all participants receive visual notifications and explicit consent banners before recording starts.
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4. AI Study Assistant */}
                <section id="ai-processing" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Section 4</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    AI Study Assistant & Data Isolation
                  </h2>
                  <p>
                    Our AI Study Assistant helps students summarize complex topics, generate practice flashcards, and review lesson takeaways:
                  </p>
                  <ul className="space-y-2 pl-4 list-disc marker:text-teal-400 text-white/75">
                    <li>
                      <strong>Zero Model Training on Personal Records:</strong> Queries submitted to the AI assistant are processed securely in isolated inference sessions. We do not allow third-party foundational models to train or retain your personal educational conversations for their public datasets.
                    </li>
                    <li>
                      <strong>Ephemeral Processing:</strong> Educational prompts sent to our server-side AI pipeline are scrubbed of sensitive identifiers before generation and stored only in your private student study notebook.
                    </li>
                  </ul>
                </section>

                {/* 5. How We Use Info */}
                <section id="usage" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <Server className="w-4 h-4" />
                    <span>Section 5</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    How We Use Your Information
                  </h2>
                  <p>We process collected data exclusively for explicit, legitimate educational purposes:</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs text-white/75">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                      <strong className="text-white block mb-1">Service Facilitation:</strong>
                      Managing lesson bookings, matching students with verified tutors, and providing interactive whiteboards.
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                      <strong className="text-white block mb-1">Safety & Verification:</strong>
                      Screening instructor credentials, preventing fraudulent bookings, and upholding child safety standards.
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                      <strong className="text-white block mb-1">Billing & Payouts:</strong>
                      Facilitating lesson escrow payments, generating receipts, and issuing educator payouts.
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                      <strong className="text-white block mb-1">Platform Diagnostics:</strong>
                      Monitoring audio/video connection stability and patching bugs reported by teachers and students.
                    </div>
                  </div>
                </section>

                {/* 6. Children's Privacy */}
                <section id="children" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <Shield className="w-4 h-4" />
                    <span>Section 6</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Children & Minor Student Privacy (COPPA & FERPA)
                  </h2>
                  <p>
                    Protecting young learners is our highest operational imperative:
                  </p>
                  <p className="text-white/75">
                    Under the Children’s Online Privacy Protection Act (COPPA), students under the age of 13 may only participate on LiveClass with verifiable parental or legal guardian consent. Parents and guardians maintain the right to review the personal information collected from their child, request deletion, and prohibit further data collection at any time.
                  </p>
                  <p className="text-white/75">
                    We strictly prohibit targeted behavioral advertising, cross-context behavioral tracking, and profiling of any minor user on the platform.
                  </p>
                </section>

                {/* 7. Security Safeguards */}
                <section id="security" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <Lock className="w-4 h-4" />
                    <span>Section 7</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Security & Encryption Safeguards
                  </h2>
                  <p>
                    We implement defense-in-depth technical and organizational controls:
                  </p>
                  <ul className="space-y-2 pl-4 list-disc marker:text-teal-400 text-white/75">
                    <li>Transport Layer Security (TLS 1.3) for all web traffic and API endpoints.</li>
                    <li>AES-256 encryption at rest for all database volumes and persistent assets.</li>
                    <li>Role-Based Access Control (RBAC) strictly isolating student data from unauthorized platform accounts.</li>
                    <li>Continuous monitoring, rate limiting, and automated brute-force protection across authentication routes.</li>
                  </ul>
                </section>

                {/* 8. User Rights */}
                <section id="rights" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <UserCheck className="w-4 h-4" />
                    <span>Section 8</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Your Rights (GDPR, CCPA & Global Protections)
                  </h2>
                  <p>
                    Regardless of your geographic location, LiveClass affords you comprehensive rights over your personal data:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs text-white/75">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <strong className="text-white block mb-1">Right to Access & Portability:</strong>
                      Download an archive of your profile, lesson logs, and study records in a standard machine-readable format.
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <strong className="text-white block mb-1">Right to Erasure ("To Be Forgotten"):</strong>
                      Request complete deletion of your account and associated personal data from active databases.
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <strong className="text-white block mb-1">Right to Rectification:</strong>
                      Correct any outdated or inaccurate profile details directly from your dashboard settings.
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <strong className="text-white block mb-1">Right to Non-Discrimination:</strong>
                      Exercising your privacy rights will never result in degraded quality of education or service denial.
                    </div>
                  </div>
                </section>

                {/* 9. Contact */}
                <section id="contact" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <Mail className="w-4 h-4" />
                    <span>Section 9</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Contact Our Privacy Office
                  </h2>
                  <p>
                    If you have questions, feedback, or would like to exercise any of your privacy rights, our designated Data Protection Officer is ready to assist:
                  </p>
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-white font-semibold text-base">LiveClass Data Protection Office</div>
                      <div className="text-xs text-white/60 mt-1">Direct inquiries answered within 48 business hours</div>
                      <div className="text-xs text-teal-300 font-mono mt-2">privacy@liveclass.app</div>
                    </div>
                    <a
                      href="mailto:privacy@liveclass.app"
                      className="btn-metallic-solid px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-full"
                    >
                      Email Privacy Team
                    </a>
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* Terms of Service View */}
                <section id="terms-agreement" className="space-y-4">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <Scale className="w-4 h-4" />
                    <span>Section 1</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Acceptance of Terms
                  </h2>
                  <p>
                    By creating an account, accessing, or utilizing the LiveClass website, virtual classroom, or associated services, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not access or use the platform.
                  </p>
                </section>

                <section id="terms-accounts" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <UserCheck className="w-4 h-4" />
                    <span>Section 2</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Eligibility & Account Security
                  </h2>
                  <p>
                    You must be at least 18 years of age, or have the express consent of a parent or guardian, to establish a student account. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
                  </p>
                </section>

                <section id="terms-tutors" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <Shield className="w-4 h-4" />
                    <span>Section 3</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Tutor Verification & Classroom Code of Conduct
                  </h2>
                  <p>
                    Educators on LiveClass undergo credential verification and must adhere to our Educator Standards. All users—both students and tutors—agree to conduct themselves professionally, respectfully, and without harassment, discrimination, or abusive conduct during live interactive video sessions.
                  </p>
                </section>

                <section id="terms-bookings" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4" />
                    <span>Section 4</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Bookings, Payments & Cancellations
                  </h2>
                  <p>
                    Lesson fees are agreed upon prior to booking confirmation. Cancellations made more than 24 hours prior to a scheduled session are eligible for full rescheduling or refund. Cancellations made within 24 hours may be subject to standard teacher preparation fee adjustments.
                  </p>
                </section>

                <section id="terms-ip" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <FileText className="w-4 h-4" />
                    <span>Section 5</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Intellectual Property & Classroom Materials
                  </h2>
                  <p>
                    Tutors retain full intellectual property rights to their original instructional lesson materials. Students receive a personal, non-exclusive license to study and review materials provided during their booked sessions.
                  </p>
                </section>

                <section id="terms-liability" className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider">
                    <Lock className="w-4 h-4" />
                    <span>Section 6</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Disclaimers & Limitation of Liability
                  </h2>
                  <p>
                    LiveClass provides virtual classroom infrastructure and verified tutor matching. While we perform thorough educator verification, the educational performance and individual student results depend on personalized effort and circumstance. To the maximum extent permitted by applicable law, LiveClass shall not be liable for indirect, incidental, or consequential damages.
                  </p>
                </section>
              </>
            )}
          </main>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/10 py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <div className="flex items-center gap-4">
            <BrandLogo variant="horizontal" size="sm" isDark={true} />
            <span className="text-white/30">|</span>
            <span>Educational Trust & Security Standard</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => handleTabChange("privacy")}
              className={`hover:text-white transition-colors cursor-pointer ${
                activeTab === "privacy" ? "text-teal-400 font-semibold" : ""
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => handleTabChange("terms")}
              className={`hover:text-white transition-colors cursor-pointer ${
                activeTab === "terms" ? "text-teal-400 font-semibold" : ""
              }`}
            >
              Terms of Service
            </button>
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
