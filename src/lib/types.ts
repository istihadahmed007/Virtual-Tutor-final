// ─── Core Types ─────────────────────────────────────────
export type UserRole = "student" | "teacher" | "admin";
export type SessionType = "1-to-1" | "small-group" | "trial" | "mentoring" | "exam-prep" | "project-help";
export type SessionStatus = "scheduled" | "live" | "ended" | "cancelled";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type MessageType = "chat" | "question" | "reaction" | "hand-raise" | "system";

// ─── Teacher ────────────────────────────────────────────
export interface Teacher {
  id: string;
  userId: string;
  name: string;
  title: string;
  bio: string;
  subjects: string[];
  expertise: string[];
  education: string;
  certifications: string[];
  languages: string[];
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  totalStudents: number;
  totalHours: number;
  yearsExperience: number;
  isVerified: boolean;
  isAvailable: boolean;
  avatarUrl: string;
  introVideoUrl?: string;
  teachingStyle: string[];
  badge?: string;
}

export interface TeacherReview {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  subject: string;
  createdAt: string;
}

// ─── Live Session ───────────────────────────────────────
export interface LiveSession {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: string;
  title: string;
  subject: string;
  description: string;
  scheduledAt: Date;
  durationMinutes: number;
  maxStudents: number;
  enrolledCount: number;
  enrolledStudentIds: string[];
  status: SessionStatus;
  meetingCode: string;
  sessionType: SessionType;
  price: number;
}

// ─── Booking ────────────────────────────────────────────
export interface Booking {
  id: string;
  userId: string;
  teacherId: string;
  teacherName: string;
  studentName: string;
  date: string;
  timeSlot: string;
  durationMinutes: number;
  subject: string;
  sessionType: SessionType;
  price: number;
  status: BookingStatus;
  meetingCode?: string;
}

// ─── Chat ───────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: Date;
  type: MessageType;
}

// ─── Direct Message ─────────────────────────────────────
export interface Conversation {
  id: string;
  participants: string[];
  participantNames: string[];
  participantAvatar?: string[];
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

// ─── Community ──────────────────────────────────────────
export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatar: string;
  title: string;
  content: string;
  subject?: string;
  tags: string[];
  likesCount: number;
  repliesCount: number;
  createdAt: Date;
}

export interface CommunityReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  likesCount: number;
  createdAt: Date;
}

// ─── Session Notes ──────────────────────────────────────
export interface SessionFeedback {
  id: string;
  sessionId: string;
  teacherId: string;
  studentId: string;
  feedback: string;
  homework?: string;
  strengths: string[];
  improvements: string[];
  createdAt: Date;
}

// ─── AI Learning Summary ────────────────────────────────
export interface LearningSummary {
  sessionId: string;
  whatYouLearned: string[];
  whatYouStruggled: string[];
  whatToPractice: string[];
  recommendedNext?: string;
}

// ─── Navigation ─────────────────────────────────────────
export interface NavLink {
  label: string;
  path: string;
  icon: string;
  authRequired: boolean;
  roles?: UserRole[];
}
