/**
 * High-quality, properly attributed educational photography from Unsplash.
 *
 * All images are from Unsplash (https://unsplash.com) and free to use
 * under the Unsplash License.
 *
 * Image subjects: teaching environments, learning spaces, technology,
 * collaboration — NOT fake user portraits.
 */

// Base Unsplash URL with responsive sizing
const unsplash = (id: string, w: number = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

// ============================================================
// LANDING PAGE — Hero & Sections
// ============================================================

/** Hero: Teacher in a modern video call with student, warm lighting, natural interaction */
export const HERO_IMAGE = unsplash("photo-1524178232363-6fb1686f6009", 900);

/** Live class section: Teacher presenting on screen with whiteboard, modern classroom */
export const LIVE_CLASS_IMAGE = unsplash("photo-1588196749597-9ff075ee6b5b", 800);

/** Human connection: Mentor and student in deep conversation */
export const HUMAN_CONNECTION_1 = unsplash("photo-1522202176988-66273c2fd55f", 600);

/** Human connection: Collaborative learning with discussion */
export const HUMAN_CONNECTION_2 = unsplash("photo-1531482615713-2afd69097998", 600);

/** Human connection: Student receiving feedback */
export const HUMAN_CONNECTION_3 = unsplash("photo-1523240795612-9a054b0db644", 600);

/** Teacher discovery banner: Diverse teaching environments */
export const TEACHER_DISCOVERY_BANNER = unsplash("photo-1524178232363-6fb1686f6009", 1200);

// ============================================================
// SUBJECT-SPECIFIC IMAGES
// ============================================================

export const SUBJECT_IMAGES: Record<string, string> = {
  Mathematics: unsplash("photo-1635070041078-e363dbe005cb", 500),
  Physics: unsplash("photo-1636466497217-26a8cbeaf0aa", 500),
  Chemistry: unsplash("photo-1532094349884-543bc11b234d", 500),
  English: unsplash("photo-1456513080510-7bf3a84b82f8", 500),
  Biology: unsplash("photo-1530026405186-ed1f139313f8", 500),
  Programming: unsplash("photo-1461749280684-dccba630e2f6", 500),
  "IELTS": unsplash("photo-1434030216411-0b793f4b4173", 500),
  "Business": unsplash("photo-1507003211169-0a1dd7228f2d", 500),
  Design: unsplash("photo-1558655146-9f40138edfeb", 500),
  "Data Analytics": unsplash("photo-1551288049-bebda4e38f71", 500),
  Accounting: unsplash("photo-1554224155-6726b3ff858f", 500),
  Marketing: unsplash("photo-1460925895917-afdab827c52f", 500),
};

// ============================================================
// EMPTY STATE ILLUSTRATIONS
// ============================================================

/** Empty state: no classes yet — modern calendar/workspace */
export const EMPTY_CLASSES_IMAGE = unsplash("photo-1506784983877-45594efa4bbe", 400);

/** Empty state: no messages — conversation starting */
export const EMPTY_MESSAGES_IMAGE = unsplash("photo-1516321318423-f06f85e504b3", 400);

/** Empty state: community — collaborative learning */
export const EMPTY_COMMUNITY_IMAGE = unsplash("photo-1529156069898-49953e39b3ac", 400);

/** Empty state: no progress — learning journey beginning */
export const EMPTY_PROGRESS_IMAGE = unsplash("photo-1434030216411-0b793f4b4173", 400);

// ============================================================
// DASHBOARD
// ============================================================

/** Dashboard background subtle image */
export const DASHBOARD_ACCENT = unsplash("photo-1519389950473-47ba0277781c", 600);

// ============================================================
// AUTH PAGE
// ============================================================

/** Auth page side image: modern learning setup */
export const AUTH_SIDE_IMAGE = unsplash("photo-1522202176988-66273c2fd55f", 700);

// ============================================================
// COMMUNITY
// ============================================================

/** Community header: group discussion, diverse students */
export const COMMUNITY_HEADER = unsplash("photo-1529156069898-49953e39b3ac", 1000);
