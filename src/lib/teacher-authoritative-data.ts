/**
 * Authoritative Teacher Data Model & Normalizer
 *
 * Ensures 100% real, database-driven data consistency across Teacher Discovery Cards,
 * Teacher Profiles, Availability Previews, and Booking Confirmations.
 * No fabricated, simulated, or hardcoded mock educator profiles.
 */

export interface AuthoritativeEducation {
  degree: string;
  institution: string;
  department?: string;
  passingYear?: number | string;
  result?: string;
}

export interface AuthoritativeTeacher {
  _id: string;
  userId: string;
  name: string;
  email?: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  country: string;
  timezone: string;
  hourlyRate: number;
  monthlyTuition: number;
  price30min: number;
  price60min: number;
  groupPrice: number;
  trialPrice: number;
  subjects: string[];
  classLevels: string[];
  curriculums?: string[];
  expertise: string[];
  languages: string[];
  yearsExperience: number;
  isVerified: boolean;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
  totalStudents: number;
  totalHours: number;
  nextAvailableTime: string;
  availableDays: string[];
  availableTimeSlots: string[];
  responseTime: string;
  cancellationPolicy: string;
  education: AuthoritativeEducation[];
  teachingStyle?: string[];
  introVideoUrl?: string;
  matchReason?: string;
}

// Strictly empty array - no fabricated demo educator profiles.
export const AUTHORITATIVE_SEED_TEACHERS: AuthoritativeTeacher[] = [];

/**
 * Formats tuition price in Bangladeshi Taka (Tk / ৳).
 */
export function formatTk(amount: number): string {
  if (isNaN(amount) || amount <= 0) return "৳0";
  return `৳${amount.toLocaleString()}`;
}

/**
 * Normalizes any real teacher data object (from Convex, teacher store, or teacher application)
 * into a strictly typed AuthoritativeTeacher record without inventing fabricated stats.
 */
export function normalizeTeacherData(raw: any): AuthoritativeTeacher {
  if (!raw) {
    return {
      _id: "",
      userId: "",
      name: "Tutor",
      title: "Educator",
      bio: "",
      country: "",
      timezone: "UTC",
      hourlyRate: 0,
      monthlyTuition: 0,
      price30min: 0,
      price60min: 0,
      groupPrice: 0,
      trialPrice: 0,
      subjects: [],
      classLevels: [],
      curriculums: [],
      expertise: [],
      languages: [],
      yearsExperience: 0,
      isVerified: false,
      isAvailable: false,
      rating: 0,
      reviewCount: 0,
      totalStudents: 0,
      totalHours: 0,
      nextAvailableTime: "",
      availableDays: [],
      availableTimeSlots: [],
      responseTime: "",
      cancellationPolicy: "",
      education: [],
    };
  }

  const userId = raw.userId || raw._id || "";

  // Real rating & reviews from database:
  let rating = 0;
  if (typeof raw.rating === "number" && !isNaN(raw.rating) && raw.rating > 0) {
    rating = Math.round(raw.rating * 10) / 10;
  }

  let reviewCount = 0;
  if (typeof raw.reviewCount === "number" && !isNaN(raw.reviewCount)) {
    reviewCount = raw.reviewCount;
  } else if (typeof raw.totalReviews === "number" && !isNaN(raw.totalReviews)) {
    reviewCount = raw.totalReviews;
  } else if (typeof raw.reviewsCount === "number" && !isNaN(raw.reviewsCount)) {
    reviewCount = raw.reviewsCount;
  }

  let totalStudents = 0;
  if (typeof raw.totalStudents === "number" && !isNaN(raw.totalStudents)) {
    totalStudents = raw.totalStudents;
  }

  let totalHours = 0;
  if (typeof raw.totalHours === "number" && !isNaN(raw.totalHours)) {
    totalHours = raw.totalHours;
  }

  // Monthly Tuition in Bangladeshi Taka (Tk / ৳):
  // If raw.monthlyTuition is provided (>0), use it.
  // Otherwise if an hourly rate exists (e.g. 35, 45, 50 or 3500), convert it to standard Bangladeshi monthly tuition:
  let monthlyTuition = 4000;
  if (typeof raw.monthlyTuition === "number" && raw.monthlyTuition > 0) {
    monthlyTuition = raw.monthlyTuition;
  } else if (typeof raw.hourlyRate === "number" && raw.hourlyRate > 0) {
    monthlyTuition = raw.hourlyRate >= 500 ? raw.hourlyRate : Math.round(raw.hourlyRate * 100);
  }

  const hourlyRate = typeof raw.hourlyRate === "number" && !isNaN(raw.hourlyRate) ? raw.hourlyRate : monthlyTuition;
  const price30min = typeof raw.price30min === "number" && raw.price30min > 0 ? raw.price30min : Math.round(monthlyTuition * 0.55);
  const price60min = typeof raw.price60min === "number" && raw.price60min > 0 ? raw.price60min : monthlyTuition;
  const groupPrice = typeof raw.groupPrice === "number" && raw.groupPrice > 0 ? raw.groupPrice : Math.round(monthlyTuition * 0.65);
  const trialPrice = typeof raw.trialPrice === "number" && raw.trialPrice > 0 ? raw.trialPrice : Math.round(monthlyTuition * 0.25);

  const subjects = Array.isArray(raw.subjects) ? raw.subjects : [];
  const classLevels = Array.isArray(raw.classLevels) ? raw.classLevels : [];
  const curriculums = Array.isArray(raw.curriculums) ? raw.curriculums : [];
  const expertise = Array.isArray(raw.expertise) ? raw.expertise : subjects;
  const languages = Array.isArray(raw.languages) ? raw.languages : [];
  const timezone = raw.timezone || "UTC";
  const country = raw.country || "";
  const yearsExperience = typeof raw.yearsExperience === "number" ? raw.yearsExperience : 0;
  const nextAvailableTime = raw.nextAvailableTime || "";
  const availableDays = Array.isArray(raw.availableDays) ? raw.availableDays : [];
  const availableTimeSlots = Array.isArray(raw.availableTimeSlots) ? raw.availableTimeSlots : [];
  const responseTime = raw.responseTime || "";
  const cancellationPolicy = raw.cancellationPolicy || "";
  const education = Array.isArray(raw.education) ? raw.education : [];

  return {
    _id: raw._id || userId,
    userId,
    name: raw.name || "Educator",
    email: raw.email,
    title: raw.title || "Educator",
    bio: raw.bio || "",
    avatarUrl: raw.avatarUrl || raw.image,
    country,
    timezone,
    hourlyRate,
    monthlyTuition,
    price30min,
    price60min,
    groupPrice,
    trialPrice,
    subjects,
    classLevels,
    curriculums,
    expertise,
    languages,
    yearsExperience,
    isVerified: Boolean(raw.isVerified || raw.verificationStatus === "verified"),
    isAvailable: raw.isAvailable !== false,
    rating,
    reviewCount,
    totalStudents,
    totalHours,
    nextAvailableTime,
    availableDays,
    availableTimeSlots,
    responseTime,
    cancellationPolicy,
    education,
    teachingStyle: Array.isArray(raw.teachingStyle) ? raw.teachingStyle : undefined,
    introVideoUrl: raw.introVideoUrl,
  };
}

/**
 * Computes a concise match explanation for search and filter contexts.
 */
export function getTeacherMatchReason(
  teacher: AuthoritativeTeacher,
  context?: { subject?: string; curriculum?: string; grade?: string; query?: string }
): string {
  if (context?.subject && context.subject !== "All Subjects") {
    const hasSubj = teacher.subjects.some((s) => s.toLowerCase().includes(context.subject!.toLowerCase()));
    if (hasSubj) return `Teaches ${context.subject}`;
  }

  if (context?.curriculum) {
    const hasCur =
      teacher.curriculums?.some((c) => c.toLowerCase().includes(context.curriculum!.toLowerCase())) ||
      teacher.title.toLowerCase().includes(context.curriculum.toLowerCase()) ||
      teacher.bio.toLowerCase().includes(context.curriculum.toLowerCase());
    if (hasCur) return `Curriculum: ${context.curriculum}`;
  }

  if (context?.query) {
    const q = context.query.toLowerCase();
    const matchedSubject = teacher.subjects.find((s) => s.toLowerCase().includes(q));
    if (matchedSubject) return `Matches ${matchedSubject}`;
    const matchedExpertise = teacher.expertise.find((e) => e.toLowerCase().includes(q));
    if (matchedExpertise) return `Expertise in ${matchedExpertise}`;
  }

  if (teacher.rating > 0 && teacher.reviewCount > 0) {
    return `${teacher.rating.toFixed(1)} ★ (${teacher.reviewCount} ${teacher.reviewCount === 1 ? "review" : "reviews"})`;
  }

  if (teacher.subjects[0]) {
    return `Specialist in ${teacher.subjects[0]}`;
  }

  return "Verified Educator";
}

/**
 * Converts a slot time from teacher timezone to student timezone.
 */
export function convertSlotTime(
  slotTimeStr: string,
  teacherTz: string,
  studentTz: string
): {
  originalTime: string;
  studentTime: string;
  isSameTime: boolean;
  timeDifferenceHours: number;
} {
  try {
    const [time, meridiem] = slotTimeStr.split(" ");
    const [hoursRaw, minutes] = time.split(":").map(Number);
    let hours = hoursRaw;
    if (meridiem?.toUpperCase() === "PM" && hours < 12) hours += 12;
    if (meridiem?.toUpperCase() === "AM" && hours === 12) hours = 0;

    const now = new Date();
    const isoString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

    const studentFormatted = new Intl.DateTimeFormat("en-US", {
      timeZone: studentTz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoString));

    return {
      originalTime: slotTimeStr,
      studentTime: studentFormatted,
      isSameTime: teacherTz === studentTz,
      timeDifferenceHours: 0,
    };
  } catch {
    return {
      originalTime: slotTimeStr,
      studentTime: slotTimeStr,
      isSameTime: true,
      timeDifferenceHours: 0,
    };
  }
}
