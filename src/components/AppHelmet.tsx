import React, { useMemo } from "react";
import { useLocation } from "react-router";
import { SEO, SEOProps } from "./SEO";

export interface RouteMeta {
  title: string;
  description: string;
  keywords?: string[];
  noindex?: boolean;
  ogType?: "website" | "profile" | "article";
}

// Route metadata directory for dynamic SEO resolution across the app
export const ROUTE_META_MAP: Record<string, RouteMeta> = {
  "/": {
    title: "Online Tutoring & Live Classroom Platform",
    description:
      "Connect with expert educators, attend interactive live video classrooms, practice with AI learning tools, and accelerate your academic potential.",
    keywords: [
      "online tutoring",
      "live classroom",
      "find a tutor",
      "interactive learning",
      "monthly tuition",
      "virtual tutor pro",
    ],
    noindex: false,
  },
  "/teachers": {
    title: "Find Verified Tutors & Educators",
    description:
      "Explore verified, top-tier tutors across mathematics, sciences, languages, and test preparation with transparent monthly tuition plans in Bangladeshi Taka.",
    keywords: [
      "verified tutors",
      "math tutor",
      "physics educator",
      "STEM tutoring",
      "monthly tuition plan",
      "hire tutor online",
    ],
    noindex: false,
  },
  "/students": {
    title: "Study Partners & Student Directory",
    description:
      "Connect with peers, find study group partners, and collaborate with fellow learners on Virtual Tutor Pro.",
    keywords: ["study partners", "peer learning", "student community", "study groups"],
    noindex: true,
  },
  "/community": {
    title: "Learning Community & Discussion Forums",
    description:
      "Engage with fellow students and verified tutors. Ask complex questions, share study notes, and collaborate on academic challenges.",
    keywords: ["student community", "study forum", "homework help", "academic discussion"],
    noindex: false,
  },
  "/resume-builder": {
    title: "Academic Resume & CV Builder",
    description:
      "Design, format, and download professional academic CVs and student resumes tailored for scholarship, college, and university admissions.",
    keywords: ["academic resume", "student CV", "resume builder", "scholarship CV"],
    noindex: false,
  },
  "/teacher-application": {
    title: "Become a Verified Tutor",
    description:
      "Apply to join Virtual Tutor Pro as a verified educator. Set your monthly tuition in Tk, teach global students, and get paid securely.",
    keywords: ["teach online", "tutor jobs", "become a tutor", "educator application"],
    noindex: false,
  },
  "/ai-assistant": {
    title: "AI Study Assistant & Problem Solver",
    description:
      "Get instant 24/7 concept explanations, homework guidance, and step-by-step math solutions powered by Gemini AI.",
    keywords: ["AI tutor", "homework solver", "study assistant", "AI learning"],
    noindex: true,
  },
  "/dashboard": {
    title: "Student Dashboard",
    description: "Access your upcoming lessons, assignments, learning streaks, and tutor feedback.",
    noindex: true,
  },
  "/lessons": {
    title: "My Lessons & Class Schedule",
    description: "View scheduled live classes, past lesson summaries, and interactive session recordings.",
    noindex: true,
  },
  "/calendar": {
    title: "Academic Calendar & Timetable",
    description: "Interactive visual calendar of your scheduled live sessions and assignment deadlines.",
    noindex: true,
  },
  "/assignments": {
    title: "Assignments & Homework Tracker",
    description: "Manage and submit coursework, review teacher evaluations, and track grades.",
    noindex: true,
  },
  "/progress": {
    title: "Academic Progress & Mastery Analytics",
    description: "Analyze subject performance, learning streaks, study hours, and academic milestones.",
    noindex: true,
  },
  "/profile": {
    title: "My Profile & Learning Preferences",
    description: "Manage account settings, academic grade levels, subjects, and notifications.",
    noindex: true,
  },
  "/messages": {
    title: "Direct Messages & Discussions",
    description: "Private messaging between students and educators for class coordination.",
    noindex: true,
  },
  "/teacher-dashboard": {
    title: "Educator Management Dashboard",
    description: "Manage student enrollments, schedule live classes, monitor earnings, and track student progress.",
    noindex: true,
  },
  "/classroom": {
    title: "Live Virtual Classroom",
    description: "Real-time interactive video classroom with synchronized whiteboard and screen sharing.",
    noindex: true,
  },
  "/auth": {
    title: "Sign In or Register",
    description: "Log in to your Virtual Tutor Pro student or educator account, or sign up today.",
    noindex: true,
  },
};

/**
 * Resolves metadata for dynamic or nested route paths.
 */
export function resolveRouteMeta(pathname: string): RouteMeta {
  // Direct match
  if (ROUTE_META_MAP[pathname]) {
    return ROUTE_META_MAP[pathname];
  }

  // Teacher Profile Route (/teachers/:id)
  if (pathname.startsWith("/teachers/")) {
    return {
      title: "Educator Profile & Availability",
      description:
        "View educator credentials, student reviews, verified qualifications, and enroll in standard monthly tuition plans.",
      keywords: ["tutor profile", "book tutor", "monthly tuition", "live classes"],
      noindex: false,
      ogType: "profile",
    };
  }

  // Live Classroom Room Route (/classroom/:id)
  if (pathname.startsWith("/classroom/")) {
    return {
      title: "Active Live Classroom Session",
      description: "Secure interactive live learning session with synchronized whiteboard and audio/video.",
      noindex: true,
    };
  }

  // Admin Routes (/admin/*)
  if (pathname.startsWith("/admin")) {
    const subRoute = pathname.replace("/admin", "").replace(/^\//, "");
    const formattedSub = subRoute
      ? subRoute
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : "Overview";
    return {
      title: `Admin Console - ${formattedSub}`,
      description: "Secure platform management, teacher verification, audit trails, and financial records.",
      noindex: true,
    };
  }

  // Default fallback for unmatched routes
  return {
    title: "Page Not Found",
    description: "The requested page on Virtual Tutor Pro could not be located.",
    noindex: true,
  };
}

export interface AppHelmetProps extends Partial<SEOProps> {
  /** Optional manual route path override (defaults to current react-router location.pathname) */
  pathname?: string;
}

/**
 * AppHelmet - Dynamically manages document titles and meta tags for the main App shell.
 * It automatically detects the active route and applies optimized SEO titles, descriptions,
 * Open Graph, Twitter Cards, and robots indexing directives, while allowing optional custom overrides.
 */
export const AppHelmet: React.FC<AppHelmetProps> = ({
  title,
  fullTitle,
  description,
  keywords,
  canonical,
  ogType,
  ogImage,
  noindex,
  structuredData,
  children,
  pathname: customPathname,
}) => {
  const location = useLocation();
  const currentPath = customPathname || location.pathname;

  const defaultMeta = useMemo(() => resolveRouteMeta(currentPath), [currentPath]);

  // Merge explicitly provided props with the resolved route metadata
  const resolvedTitle = title !== undefined ? title : defaultMeta.title;
  const resolvedDescription = description !== undefined ? description : defaultMeta.description;
  const resolvedKeywords = keywords !== undefined ? keywords : defaultMeta.keywords;
  const resolvedNoindex = noindex !== undefined ? noindex : defaultMeta.noindex;
  const resolvedOgType = ogType !== undefined ? ogType : defaultMeta.ogType || "website";

  return (
    <SEO
      title={resolvedTitle}
      fullTitle={fullTitle}
      description={resolvedDescription}
      keywords={resolvedKeywords}
      canonical={canonical}
      ogType={resolvedOgType}
      ogImage={ogImage}
      noindex={resolvedNoindex}
      structuredData={structuredData}
    >
      {children}
    </SEO>
  );
};

export default AppHelmet;
